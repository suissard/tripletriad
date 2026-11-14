/**
 * Logs de debug du moteur de skills.
 *
 * Les logs détaillés ("[Targeting-Flow]", etc.) sont exécutés à chaque dispatch, y compris
 * pendant les simulations de l'IA (des centaines d'appels par coup) et sérialisent le
 * contexte via JSON.stringify : ils doivent être désactivés par défaut.
 *
 * Activation :
 *  - Navigateur : localStorage.setItem('debug:skills', '1') puis recharger la page
 *  - Node / Strapi : DEBUG_SKILLS=1
 *
 * Usage : `DEBUG_SKILLS && console.log(...)` — le court-circuit évite d'évaluer
 * les arguments (JSON.stringify) quand le debug est désactivé.
 */
export const DEBUG_SKILLS: boolean = (() => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.DEBUG_SKILLS === '1') return true;
    return (globalThis as any).localStorage?.getItem('debug:skills') === '1';
  } catch {
    return false;
  }
})();
