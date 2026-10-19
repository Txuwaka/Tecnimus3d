export const PARTNERS=['lola','bruno','nico'];
export const CHARACTER_NAMES={lola:'Lola',bruno:'Bruno',nico:'Nico'};
export const PROFILE_KEY='tecnimus-3d-profile-v1';
const cleanName=(value,fallback)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().replace(/\s+/g,' ').slice(0,24)||fallback:fallback;
export function normalizeProfile(value={}){
  const characterNames=Object.fromEntries(PARTNERS.map(id=>[id,cleanName(value.characterNames?.[id],CHARACTER_NAMES[id])]));
  return {name:cleanName(value.name,'Jugador'),partner:PARTNERS.includes(value.partner)?value.partner:'lola',characterNames,firstHandCorrido:value.firstHandCorrido!==false};
}
export function seatRoster(value={}){const p=normalizeProfile(value),others=PARTNERS.filter(id=>id!==p.partner);return {txuwa:{name:p.name,character:'txuwa'},lola:{name:p.characterNames[p.partner],character:p.partner},bruno:{name:p.characterNames[others[0]],character:others[0]},nico:{name:p.characterNames[others[1]],character:others[1]}}}
export function loadProfile(storage){try{const v=JSON.parse(storage?.getItem(PROFILE_KEY)||'null');return v&&typeof v.name==='string'?normalizeProfile(v):null}catch{return null}}
export function saveProfile(profile,storage){const p=normalizeProfile(profile);try{storage?.setItem(PROFILE_KEY,JSON.stringify(p))}catch{}return p}
