import {createNarrationStage} from './native/narration-stage.mjs';
let plan,narrator;const urls=[];
export const voiceReady=(async()=>{const response=await fetch('voice-plan.json');if(!response.ok)throw Error('VOICE_PLAN_MISSING');plan=await response.json();const assets=[];
 // Preserve the existing native stage and full-file seek behavior. Chapter packages limit its load.
 for(const a of plan.assets){const r=await fetch(a.file.path);if(!r.ok)throw Error('AUDIO_ASSET_MISSING:'+a.id);const url=URL.createObjectURL(await r.blob());urls.push(url);assets.push({...a,file:{...a.file,path:url}});}
 narrator=createNarrationStage(plan,assets);await narrator.ready;window.historyNarration=narrator;})();
export function updateVoice(frame){narrator.update(frame);}
addEventListener('pagehide',()=>{narrator?.dispose();urls.forEach(u=>URL.revokeObjectURL(u));},{once:true});
