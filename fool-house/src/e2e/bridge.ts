import type { SceneNode } from '../scene';
import type { Board } from '../game';

export interface GameSnapshot {
  state: string; theme?: string; board: Board; collected: string[]; multiplier: number;
  phase: { startedAt: number; duration: number; now: number };
  session: { spins: number; wager: string; win: string; roundWin: string };
  bonus: { totalSteps: number; completedSteps: number; floor: number; startingWinCents: string; totalWinCents: string; stepWinCents: string; phase: string };
  scene: SceneNode | null; corridor: SceneNode | null; ui: SceneNode[];
}
declare global { interface Window { __foolHouseTest?: { read: () => GameSnapshot } } }
export function installBridge(read: () => GameSnapshot): void {
  Object.defineProperty(window, '__foolHouseTest', { value: Object.freeze({ read: () => structuredClone(read()) }), configurable: false });
}
export function observeElements(entries: {id:string; element:HTMLElement; z:number}[]): SceneNode[] {
  return entries.map(({id,element,z})=>{
    const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
    return {id,kind:element instanceof HTMLDialogElement?'modal':'panel',bounds:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},z,
      visible:!element.hidden&&rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&style.display!=='none',
      data:{inert:element.inert,ariaHidden:element.getAttribute('aria-hidden')==='true',topLayer:element instanceof HTMLDialogElement&&element.open}};
  });
}
