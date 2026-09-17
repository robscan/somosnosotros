/**
 * El aviso de Chrome, Edge o Android de que la página se puede instalar llega una sola vez, a veces antes de que cargue
 * React. Este guion va en el layout y lo guarda en `window.__avisoInstalar`; `useInstalarApp` lo lee (decisión 7 de
 * docs/rediseno/17). No se llama a preventDefault: la instalación propia del navegador sigue igual.
 */
export const EVENTO_INSTALAR = "somosnosotros-instalar";

export const GUION_AVISO_INSTALAR = `window.addEventListener("beforeinstallprompt",function(e){window.__avisoInstalar=e;window.dispatchEvent(new Event("${EVENTO_INSTALAR}"))});window.addEventListener("appinstalled",function(){window.__avisoInstalar=null;window.__appInstalada=true;window.dispatchEvent(new Event("${EVENTO_INSTALAR}"))});`;
