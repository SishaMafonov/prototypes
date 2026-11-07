// Compile with the Windows .NET Framework C# compiler; no installed packages required.
// Xoshiro128** and jump constants: Blackman/Vigna, public domain, https://prng.di.unimi.it/xoshiro128starstar.c
using System;
using System.IO;
using System.Diagnostics;
using System.Globalization;
using System.Numerics;
using System.Runtime.CompilerServices;
using System.Runtime.Serialization.Json;
using System.Text;

public sealed class Config {
    public string Id { get; set; }
    public double Low { get; set; } public double Mid { get; set; } public double High { get; set; } public double Scatter { get; set; }
    public double Coin { get; set; } public double Multiplier { get; set; } public double Stairs { get; set; } public double Ghost { get; set; }
    public int[][] Pay { get; set; } public int[] RoomBag { get; set; } public int[] Stage { get; set; } public int[] DoorBag { get; set; }
    public int CoinCents { get; set; } public int FloorCap { get; set; } public uint Seed { get; set; }
    public bool KeepScatters { get; set; }
    public bool BonusOncePerPaidChain { get; set; }
    public bool BonusAtEndOfPaidChain { get; set; }
    public bool StaticPreview { get; set; }
    public bool BonusStartsWithRoundWin { get; set; }
    public bool BonusFloorDoubling { get; set; }
    public double Mystery { get; set; }
}
public struct Rng {
    public uint A, B, C, D; public ulong Calls;
    static uint Rotate(uint x, int k) { return (x << k) | (x >> (32-k)); }
    [MethodImpl((MethodImplOptions)256)] public uint NextUInt() {
        unchecked {
            uint r=Rotate(B*5,7)*9, t=B<<9;
            C^=A; D^=B; B^=C; A^=D; C^=t; D=Rotate(D,11); Calls++; return r;
        }
    }
    [MethodImpl((MethodImplOptions)256)] public double Next() { return NextUInt() * (1.0/4294967296.0); }
    static uint Mix(ref uint x) {
        unchecked { x+=0x9e3779b9; uint z=x;z=(z^(z>>16))*0x21f0aaad;z=(z^(z>>15))*0x735a2d97;return z^(z>>15); }
    }
    public static Rng Seeded(uint seed) { Rng r=new Rng();r.A=Mix(ref seed);r.B=Mix(ref seed);r.C=Mix(ref seed);r.D=Mix(ref seed);return r; }
    public void Jump() {
        uint[] jump={0x8764000b,0xf542d2d3,0x6fa035c3,0x77f2db5b};uint a=0,b=0,c=0,d=0;
        foreach(uint j in jump)for(int bit=0;bit<32;bit++){if((j&(1U<<bit))!=0){a^=A;b^=B;c^=C;d^=D;}NextUInt();}
        A=a;B=b;C=c;D=d;Calls=0;
    }
}
public sealed class Record {
    public string ConfigId; public int Worker; public long Rounds; public long Target;
    public uint A,B,C,D; public ulong RandomCalls; public int Room;
    public string BaseCents="0", BonusCents="0";
    public double BaseSquares, BonusSquares, TotalSquares;
    public long Hits, FreeStages, Bonuses, BonusMoves, ExtraClears, Evaluations, MaxEvaluations, MaxRespin;
    public long[] TierGroups=new long[3]; public long[] TierCents=new long[3]; public long[] PrizeCounts=new long[4]; public long[] StageCounts=new long[11];
    public double Seconds;
}
public sealed class Engine {
    readonly Config cfg; readonly double low,mid,scatter,coin,mult,stairs,mystery;
    readonly int[] board=new int[25], counts=new int[16], order=new int[15];
    public Rng rng; public int room;
    public long FreeStages, Bonuses, BonusMoves, ExtraClears, Evaluations, MaxRespin;
    public long[] TierGroups=new long[3], TierCents=new long[3], PrizeCounts=new long[4], StageCounts=new long[11];
    public Engine(Config c,int worker) {
        cfg=c;mystery=c.Mystery/100;low=mystery+c.Low/100;mid=mystery+(c.Low+c.Mid)/100;scatter=(100-c.Scatter)/100;
        coin=c.Coin/100;mult=(c.Coin+c.Multiplier)/100;stairs=(c.Coin+c.Multiplier+c.Stairs)/100;
        rng=Rng.Seeded(c.Seed);for(int i=0;i<worker;i++)rng.Jump();
        room=(int)(rng.Next()*5);if(!c.StaticPreview){Fill(false,room);RevealMysteries();} // Historical preview RNG only.
    }
    [MethodImpl((MethodImplOptions)256)] int Draw(bool targeted,int currentRoom) {
        double r=rng.Next();if(r<mystery)return 16;if(r>=scatter)return 15;
        int tier=r<low?0:r<mid?1:2;
        return tier*5+(targeted?currentRoom:(int)(rng.Next()*5));
    }
    void Fill(bool targeted,int currentRoom){for(int i=0;i<25;i++)board[i]=Draw(targeted,currentRoom);}
    void FillFloor(bool targeted,int currentRoom){for(int i=0;i<25;i++)if(!cfg.KeepScatters||board[i]!=15)board[i]=Draw(targeted,currentRoom);}
    void Refill(bool targeted,int currentRoom){for(int i=0;i<25;i++)if(board[i]<0)board[i]=Draw(targeted,currentRoom);}
    void RevealMysteries(){if(Array.IndexOf(board,16)<0)return;int id=(int)(rng.Next()*3)*5+room;for(int i=0;i<25;i++)if(board[i]==16)board[i]=id;}
    int OtherRoom(){int r=(int)(rng.Next()*4);return r>=room?r+1:r;}
    BigInteger DoorBonus(int moves,long roundWin) {
        BigInteger seed=cfg.BonusStartsWithRoundWin?new BigInteger(roundWin):BigInteger.Zero;
        Bonuses++;int floor=1;BigInteger pot=seed;
        for(int i=0;i<moves;i++) {
            BonusMoves++;double r=rng.Next();
            int factor=cfg.BonusFloorDoubling?1<<(floor-1):1;
            if(r<coin){pot+=cfg.CoinCents*(cfg.BonusFloorDoubling?factor:floor);PrizeCounts[0]++;}
            else if(r<mult){pot*=cfg.DoorBag[(int)(rng.Next()*cfg.DoorBag.Length)]*factor;PrizeCounts[1]++;}
            else if(r<stairs){floor=Math.Min(cfg.FloorCap,floor+1);PrizeCounts[2]++;}
            else PrizeCounts[3]++;
        }
        return pot-seed;
    }
    public void Round(out long baseCents,out BigInteger bonusCents) {
        baseCents=0;bonusCents=BigInteger.Zero;int collected=0,respin=0;bool scatterAwarded=false;
        room=OtherRoom();Fill(false,room);long evaluations=0;
        while(true) {
            if(++evaluations>1000000)throw new Exception("Unsettled paid chain; validation must not silently truncate.");
            RevealMysteries();
            Array.Clear(counts,0,16);int n=0;
            for(int i=0;i<25;i++){int id=board[i];if(counts[id]++==0&&id<15)order[n++]=id;}
            if(!cfg.BonusAtEndOfPaidChain&&!scatterAwarded&&counts[15]>=6){scatterAwarded=true;bonusCents+=DoorBonus(counts[15],baseCents);}
            int winMask=0;
            for(int j=0;j<n;j++) {
                int id=order[j], quantity=counts[id];if(quantity<5)continue;
                int tier=id/5;long award=cfg.Pay[tier][quantity>=7?2:quantity-5]*cfg.Stage[Math.Min(respin,cfg.Stage.Length-1)];
                if(id%5==room){award*=cfg.RoomBag[(int)(rng.Next()*cfg.RoomBag.Length)];collected|=1<<tier;}
                baseCents+=award;TierGroups[tier]++;TierCents[tier]+=award;winMask|=1<<id;
            }
            if(winMask==0) {
                if(collected==0||(cfg.KeepScatters&&counts[15]>20)) {
                    if(cfg.BonusAtEndOfPaidChain&&!scatterAwarded&&counts[15]>=6){scatterAwarded=true;bonusCents+=DoorBonus(counts[15],baseCents);}
                    break;
                }
                ExtraClears++;FillFloor(true,room);continue;
            }
            if(collected==7) {
                room=OtherRoom();collected=0;if(!cfg.BonusOncePerPaidChain)scatterAwarded=false;respin++;FreeStages++;StageCounts[Math.Min(10,respin)]++;
                FillFloor(false,room);
            } else {
                for(int i=0;i<25;i++)if((winMask&(1<<board[i]))!=0)board[i]=-1;
                Refill(collected!=0,room);
            }
        }
        Evaluations+=evaluations;MaxRespin=Math.Max(MaxRespin,respin);
        if(evaluations>MaxRoundEvaluations)MaxRoundEvaluations=evaluations;
    }
    public long MaxRoundEvaluations;
    public string Trace(long b,BigInteger d){return b.ToString()+","+d.ToString()+","+room+","+rng.A+","+rng.B+","+rng.C+","+rng.D+","+rng.Calls;}
}
public static class Program {
    static string Encode<T>(T value) { using(var s=new MemoryStream()){new DataContractJsonSerializer(typeof(T)).WriteObject(s,value);return Encoding.UTF8.GetString(s.ToArray());} }
    static T Decode<T>(string value) { using(var s=new MemoryStream(Encoding.UTF8.GetBytes(value))){return (T)new DataContractJsonSerializer(typeof(T)).ReadObject(s);} }
    static void Save(string file,Record r) {
        if(file==null)return;
        string tmp=file+".tmp";File.WriteAllText(tmp,Encode(r));
        if(File.Exists(file)){File.Copy(file,file+".bak",true);File.Delete(file);}File.Move(tmp,file);
    }
    public static void Main(string[] args) {
        CultureInfo.CurrentCulture=CultureInfo.InvariantCulture;
        var options=new System.Collections.Generic.Dictionary<string,string>();
        foreach(string arg in args){string[] parts=arg.Replace("--","").Split(new[]{'='},2);options[parts[0]]=parts.Length>1?parts[1]:"true";}
        Config cfg=Decode<Config>(File.ReadAllText(options["config"]));
        int worker=options.ContainsKey("worker")?int.Parse(options["worker"]):0;
        long target=long.Parse(options["rounds"]);string output=options.ContainsKey("out")?options["out"]:null;
        long batch=options.ContainsKey("batch")?long.Parse(options["batch"]):1000000;
        Engine e=new Engine(cfg,worker);Record r=new Record { ConfigId=cfg.Id,Worker=worker,Target=target };
        long baseSum=0,bonusSum=0;BigInteger extraBonus=BigInteger.Zero;
        if(options.ContainsKey("resume")&&output!=null&&File.Exists(output)) {
            r=Decode<Record>(File.ReadAllText(output));if(r.ConfigId!=cfg.Id||r.Worker!=worker||r.Target!=target)throw new Exception("Checkpoint config/worker/target mismatch");
            e.rng=new Rng{A=r.A,B=r.B,C=r.C,D=r.D,Calls=r.RandomCalls};e.room=r.Room;
            e.FreeStages=r.FreeStages;e.Bonuses=r.Bonuses;e.BonusMoves=r.BonusMoves;e.ExtraClears=r.ExtraClears;e.Evaluations=r.Evaluations;e.MaxRoundEvaluations=r.MaxEvaluations;e.MaxRespin=r.MaxRespin;
            e.TierGroups=r.TierGroups;e.TierCents=r.TierCents;e.PrizeCounts=r.PrizeCounts;e.StageCounts=r.StageCounts;
            baseSum=long.Parse(r.BaseCents);BigInteger total=BigInteger.Parse(r.BonusCents);if(total<=long.MaxValue)bonusSum=(long)total;else extraBonus=total;
        }
        var clock=Stopwatch.StartNew();double priorSeconds=r.Seconds;
        for(long i=r.Rounds;i<target;i++) {
            long b;BigInteger d;e.Round(out b,out d);
            checked { baseSum+=b; }
            if(d<=long.MaxValue-bonusSum)bonusSum+=(long)d;else extraBonus+=d;
            double bd=b,dd=(double)d,total=bd+dd;
            r.BaseSquares+=bd*bd;r.BonusSquares+=dd*dd;r.TotalSquares+=total*total;if(total>0)r.Hits++;
            r.Rounds=i+1;
            if(options.ContainsKey("trace"))Console.WriteLine(e.Trace(b,d));
            if(r.Rounds%batch==0||r.Rounds==target) {
                r.A=e.rng.A;r.B=e.rng.B;r.C=e.rng.C;r.D=e.rng.D;r.RandomCalls=e.rng.Calls;r.Room=e.room;
                r.BaseCents=baseSum.ToString();r.BonusCents=(extraBonus+bonusSum).ToString();
                r.FreeStages=e.FreeStages;r.Bonuses=e.Bonuses;r.BonusMoves=e.BonusMoves;r.ExtraClears=e.ExtraClears;r.Evaluations=e.Evaluations;r.MaxEvaluations=e.MaxRoundEvaluations;r.MaxRespin=e.MaxRespin;
                r.TierGroups=e.TierGroups;r.TierCents=e.TierCents;r.PrizeCounts=e.PrizeCounts;r.StageCounts=e.StageCounts;r.Seconds=priorSeconds+clock.Elapsed.TotalSeconds;
                Save(output,r);
                if(!options.ContainsKey("trace"))Console.WriteLine(Encode(r));
            }
        }
    }
}
