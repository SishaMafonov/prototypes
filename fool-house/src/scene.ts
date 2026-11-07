import { REEL_COLUMNS, REEL_ROWS } from './game.ts';
import type { Board } from './game.ts';

export interface Rect { x: number; y: number; width: number; height: number }
export interface SceneNode { id: string; kind: string; bounds: Rect; z: number; visible: boolean; clip?: Rect; data?: Record<string, string | number | boolean | null>; children?: SceneNode[] }
interface Size { width: number; height: number }
// Measured transparent apertures in main-5x5.png (1164 ×1351 source pixels).
export const COLUMN_OPENINGS = [[143,147],[321,153],[505,154],[690,153],[875,146]] as const;
export const ROW_OPENINGS = [[202,143],[377,161],[572,164],[769,160],[963,162]] as const;
export interface BaseLayout {
  viewport: Rect; background: Rect; title: Rect; reels: Rect; hud: Rect; collection: Rect;
  cells: Rect[][]; slots: Rect[]; padding: number; scale: number; symbolHeight: number; labelHeight: number;
}

// The renderer and structural tests consume this same geometry, in CSS pixels.
export function layoutBaseScene(width: number, height: number, hudHeight: number, background: Size, reels: Size, title: Size): BaseLayout {
  const backgroundScale=Math.max(width/background.width,height/background.height);
  const backgroundWidth=background.width*backgroundScale,backgroundHeight=background.height*backgroundScale;
  const padding=Math.min(24,Math.min(width,height)*.03),mobile=width<=600&&height>width;
  const gap=Math.min(mobile?10:16,height*.02);
  const titleScale=Math.min((width-padding*2)/title.width,Math.min(150,height*.14)/title.height);
  const titleWidth=title.width*titleScale,titleHeight=title.height*titleScale;
  const compact=height<500,symbolHeight=Math.min(mobile?64:80,height*(compact || mobile ? .08 : .09));
  const labelHeight=compact?13:15,collectionHeight=symbolHeight+labelHeight;
  const hudTop=height-hudHeight,topReserve=padding+titleHeight+gap,bottomReserve=hudHeight+collectionHeight+gap*2;
  const scale=Math.min((width-(mobile?4:padding)*2)/reels.width,Math.max(1,mobile?height-topReserve-bottomReserve:height-2*Math.max(topReserve,bottomReserve))/reels.height);
  const reelsWidth=reels.width*scale,reelsHeight=reels.height*scale,left=(width-reelsWidth)/2,centerTop=(height-reelsHeight)/2;
  const top=mobile?Math.max(topReserve,Math.min(centerTop,height-bottomReserve-reelsHeight)):centerTop;
  const collectionTop=(top+reelsHeight+hudTop-collectionHeight)/2;
  const slotWidth=Math.min(compact?64:100,(width-padding*2)/3),collectionLeft=(width-slotWidth*3)/2;
  return {
    viewport:{x:0,y:0,width,height},background:{x:(width-backgroundWidth)/2,y:(height-backgroundHeight)/2,width:backgroundWidth,height:backgroundHeight},
    title:{x:(width-titleWidth)/2,y:padding,width:titleWidth,height:titleHeight},reels:{x:left,y:top,width:reelsWidth,height:reelsHeight},hud:{x:0,y:hudTop,width,height:hudHeight},
    collection:{x:collectionLeft,y:collectionTop-4,width:slotWidth*3,height:collectionHeight+8},
    slots:Array.from({length:3},(_,i)=>({x:collectionLeft+i*slotWidth,y:collectionTop,width:slotWidth,height:collectionHeight})),
    cells:Array.from({length:REEL_ROWS},(_,r)=>Array.from({length:REEL_COLUMNS},(_,c)=>({x:left+COLUMN_OPENINGS[c][0]*scale,y:top+ROW_OPENINGS[r][0]*scale,width:COLUMN_OPENINGS[c][1]*scale,height:ROW_OPENINGS[r][1]*scale}))),
    padding,scale,symbolHeight,labelHeight,
  };
}

export function baseSceneGraph(layout: BaseLayout, board: Board, collected: ReadonlySet<string>, state: string): SceneNode {
  const node=(id:string,kind:string,bounds:Rect,z:number):SceneNode=>({id,kind,bounds,z,visible:true});
  const cells=layout.cells.flatMap((row,r)=>row.map((bounds,c)=>({...node(`cell-${r}-${c}`,'cell',bounds,20),clip:bounds,data:{row:r,column:c,tier:board[r]?.[c]?.tier??'empty',index:board[r]?.[c]?.index??-1}})));
  return {...node('base','scene',layout.viewport,0),children:[node('background','image',layout.background,0),
    {...node('reels','group',layout.reels,20),children:[...cells,node('reel-frame','image',layout.reels,30),{...node('mystery-picker','overlay',layout.reels,40),visible:state==='mystery-picking'}]},
    {...node('collection','panel',layout.collection,40),children:layout.slots.map((bounds,i)=>({...node(`collection-${['low','mid','high'][i]}`,'collectible',bounds,41),data:{collected:collected.has(['low','mid','high'][i])}}))},
    node('title','image',layout.title,50),node('hud','panel',layout.hud,60)]};
}

export function layoutCorridor(width:number,height:number,elapsed:number,reduced:boolean) {
  const p=reduced?1:Math.min(1,elapsed/3000),distance=17-11.2*(p*p*(3-2*p)),camera=17-distance;
  const focal=Math.min(width*.92,height*.85),sway=reduced?0:Math.sin(elapsed/135)*width*.006;
  const project=(x:number,y:number,z=distance):[number,number]=>[width/2+x*focal/z+sway,height*.45+(2.4-y)*focal/z];
  const doors=Array.from({length:3},(_,i)=>{const center=-2.1+i*2.1,[x,y]=project(center-.72,4.25),[right,bottom]=project(center+.72,0);return{x,y,width:right-x,height:bottom-y};});
  return {distance,camera,focal,project,doors};
}
