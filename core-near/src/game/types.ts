export type Player = 'X' | 'O';
export type Direction = 'N' | 'E' | 'S' | 'W';
export interface GridPoint { readonly x: number; readonly y: number }
export interface Edge { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
export interface StaticEdge extends Edge { readonly type: 'boundary' | 'obstacle' }
export interface CellDefinition extends GridPoint { readonly blocked: boolean }
export interface CellState extends CellDefinition { owner: Player | null }
export interface LaunchPoint extends GridPoint { readonly id: string; readonly direction: Direction }
export interface BoardDefinition {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly cells: readonly CellDefinition[];
  readonly staticEdges: readonly StaticEdge[];
  readonly launchPoints: readonly LaunchPoint[];
}
export interface StaticBoard extends BoardDefinition {
  readonly cellMap: ReadonlyMap<string, CellDefinition>;
  readonly staticKeys: ReadonlySet<string>;
  readonly playableCount: number;
}
export interface RaySimulation {
  readonly points: readonly GridPoint[];
  readonly edges: readonly Edge[];
  readonly termination: 'flat-wall' | 'loop' | 'invalid';
}
export interface TraceRecord { player: Player; launchId: string; edges: readonly Edge[]; captured: number }
export interface GameState {
  currentPlayer: Player;
  trajectoryEdges: Set<string>;
  trajectories: TraceRecord[];
  cells: CellState[];
  scoreX: number;
  scoreO: number;
  phase: 'ready' | 'animating' | 'finished';
}
export interface PendingMove { readonly token: number; readonly player: Player; readonly launch: LaunchPoint; readonly simulation: RaySimulation }
