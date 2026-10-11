// Native GSAP/renderer owns drawing and playback. This bridge adds ready and disposal.
(() => {
  const {frames,fps}=window.resourceTiming;
  let timeline,disposed=false,currentFrame=0,inFlight=Promise.resolve(),busy=false,pendingFrame=null,playbackError=null;
  const draw=frame=>{
    pendingFrame=frame;if(busy)return;busy=true;
    inFlight=(async()=>{while(pendingFrame!==null&&!disposed){const next=pendingFrame;pendingFrame=null;await window.resourceNative.seekFrame(next);currentFrame=next;}})().catch(error=>{if(!disposed){playbackError=error.message;document.body.dataset.error=error.message;timeline?.pause();}}).finally(()=>{busy=false;});
  };
  const settle=async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
  const ready=(async()=>{
    await window.resourceNative?.ready;
    await window.__nativeMasksReady;await window.__paperCurlReady;
    if(disposed)throw Error('CANCELLED');
    timeline=window.__timelines?.['resource-stage'];
    if(!timeline){
      if(!window.resourceNative)throw Error('READINESS_FAILED: native surface missing');
      const clock={frame:0};timeline=gsap.timeline({paused:true}).to(clock,{frame:frames,duration:frames/fps,ease:'none',onUpdate:()=>draw(Math.min(frames-1,Math.floor(clock.frame+1e-7)))});
      window.__timelines={'resource-stage':timeline};
    }
    // Initialize lazy native tracks before advertising frame zero as ready.
    if(window.resourceNative){timeline.pause().seek(0,true);await window.resourceNative.seekFrame(0);}else timeline.pause().seek((frames-1)/fps,false).seek(0,false);await settle();document.body.dataset.ready='true';
  })();
  ready.catch(error=>{if(!disposed)document.body.dataset.error=error.message;});
  window.resourcePreview={ready,async seekFrame(frame){await ready;if(disposed)throw Error('CANCELLED');if(!Number.isSafeInteger(frame)||frame<0||frame>=frames)throw Error('INVALID_REQUEST: frame');timeline.pause();pendingFrame=null;await inFlight;if(disposed)throw Error('CANCELLED');timeline.seek(frame/fps,Boolean(window.resourceNative));await window.resourceNative?.seekFrame(frame);currentFrame=frame;await settle();return {frame,seconds:frame/fps,u:frame/frames,milliseconds:1000*frame/fps};},snapshot:()=>({currentFrame,disposed,frames,fps,playbackError}),dispose(){if(disposed)return;disposed=true;pendingFrame=null;timeline?.pause();timeline?.kill();window.resourceNative?.dispose();document.body.dataset.ready='false';}};
  addEventListener('pagehide',()=>window.resourcePreview.dispose(),{once:true});
})();
