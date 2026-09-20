// ============================================================
// ITAEB · Reserves — Connexió amb Supabase
// Si no hi ha variables d'entorn configurades, l'aplicació
// funciona en MODE DEMO (dades en memòria, com el prototip).
// ============================================================
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const DEMO = !URL || !KEY;
export const supabase = DEMO ? null : createClient(URL, KEY);

/* ---------- Autenticació ---------- */
export async function entrarAmbGoogle() {
  if (DEMO) return { error: null };
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: { hd: "itaeb.cat", prompt: "select_account" },
      redirectTo: window.location.origin,
    },
  });
}

export async function sortir() {
  if (DEMO) return;
  await supabase.auth.signOut();
}

export function onSessio(callback) {
  if (DEMO) return () => {};
  supabase.auth.getSession().then(({ data }) => callback(data.session));
  const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => callback(s));
  return () => sub.subscription.unsubscribe();
}

const ROL_APP = { alumne: "Alumne", professor: "Professor", consergeria: "Consergeria", administrador: "Administrador" };
const ROL_DB = { Alumne: "alumne", Professor: "professor", Consergeria: "consergeria", Administrador: "administrador" };

/* ---------- Conversions BD <-> aplicació ---------- */
const matDeDB = (m) => ({
  codi: m.codi, nom: m.nom, cat: m.categoria || "Altres", marca: m.marca || "—",
  unitats: m.unitats ?? 1, ubic: m.ubicacio || "Magatzem", estat: m.estat || "Disponible",
  codiBarres: m.codi_barres || "", maleta: !!m.maleta, incidencia: m.incidencia || undefined,
});
const matADB = (m) => ({
  codi: m.codi, nom: m.nom, categoria: m.cat, marca: m.marca, unitats: m.unitats,
  ubicacio: m.ubic, estat: m.estat, codi_barres: m.codiBarres || null, maleta: !!m.maleta,
});
const resDeDB = (r) => ({
  id: r.id, lot: r.lot || undefined, tipus: r.tipus, ref: r.ref, refNom: r.ref_nom,
  quantitat: r.quantitat ?? 1, sol: r.sol_nom || r.sol_email, solEmail: r.sol_email,
  rol: ROL_APP[r.rol_sol] || "Alumne", professors: r.professors || [],
  professor: (r.professors || [])[0] || "", profsRecollida: r.profs_recollida || [],
  responsable: r.responsable_email ? { nom: r.responsable_nom || r.responsable_email, email: r.responsable_email } : undefined,
  assignatura: r.assignatura || "", data: r.data, ini: (r.hora_ini || "").slice(0, 5), fi: (r.hora_fi || "").slice(0, 5),
  persones: r.persones || undefined, motiu: r.motiu || "", foraHorari: !!r.fora_horari,
  estat: r.estat, motiuIncidencia: r.motiu_incidencia || "", retornat: r.retornat || undefined,
  origen: r.origen || undefined,
});
const resADB = (r) => ({
  lot: r.lot || null, tipus: r.tipus, ref: r.ref, ref_nom: r.refNom, quantitat: r.quantitat ?? 1,
  sol_email: r.solEmail, sol_nom: r.sol, rol_sol: ROL_DB[r.rol] || "alumne",
  professors: r.professors || [], profs_recollida: r.profsRecollida || [],
  responsable_email: r.responsable ? r.responsable.email : null,
  responsable_nom: r.responsable ? r.responsable.nom : null,
  assignatura: r.assignatura || null, data: r.data, hora_ini: r.ini, hora_fi: r.fi,
  persones: r.persones || null, motiu: r.motiu || null, fora_horari: !!r.foraHorari,
  estat: r.estat, origen: r.origen || null,
});

/* ---------- Lectures ---------- */
export const db = {
  async perfil(email, nomGoogle) {
    const { data } = await supabase.from("usuaris").select("nom, rol").eq("email", email).maybeSingle();
    // Si encara no consta a la taula usuaris, es mostra el nom del compte de Google
    return { nom: data?.nom || nomGoogle || email.split("@")[0], rol: ROL_APP[data?.rol] || "Alumne" };
  },

  async carregaTot() {
    const [mat, esp, pro, ass, usu, res] = await Promise.all([
      supabase.from("material").select("*").order("categoria").order("nom"),
      supabase.from("espais").select("*").order("nom"),
      supabase.from("protocols").select("*"),
      supabase.from("assignatures").select("nom").order("nom"),
      supabase.from("usuaris").select("email, nom, rol, grup").order("nom"),
      supabase.from("reserves").select("*").order("data", { ascending: false }).limit(2000),
    ]);
    const usuaris = usu.data || [];
    const protocols = {};
    (pro.data || []).forEach((p) => {
      if (!protocols[p.espai]) protocols[p.espai] = { max: p.max_persones, nota: "", slots: [] };
      protocols[p.espai].slots.push({ dia: p.dia, ini: (p.hora_ini || "").slice(0, 5), fi: (p.hora_fi || "").slice(0, 5) });
      protocols[p.espai].max = p.max_persones;
    });
    return {
      material: (mat.data || []).map(matDeDB),
      espais: (esp.data || []).map((e) => ({ nom: e.nom, equipament: e.equipament || "", foraHorari: !!e.fora_horari })),
      protocols,
      assignatures: (ass.data || []).map((a) => a.nom),
      profes: usuaris.filter((u) => u.rol === "professor").map((u) => ({ nom: u.nom, email: u.email })),
      alumnes: usuaris.filter((u) => u.rol === "alumne").map((u) => ({ nom: u.nom, email: u.email, grup: u.grup || "" })),
      reserves: (res.data || []).map(resDeDB),
    };
  },

  /* ---------- Reserves ---------- */
  async creaReserves(llista) {
    const { data, error } = await supabase.from("reserves").insert(llista.map(resADB)).select();
    if (error) throw error;
    return (data || []).map(resDeDB);
  },
  async canviaEstat(ids, estat, extra = {}) {
    const { error } = await supabase.from("reserves").update({ estat, ...extra }).in("id", ids);
    if (error) throw error;
  },
  async actualitzaReserva(id, patch) {
    const p = {};
    if (patch.data) p.data = patch.data;
    if (patch.ini) p.hora_ini = patch.ini;
    if (patch.fi) p.hora_fi = patch.fi;
    if (patch.motiu !== undefined) p.motiu = patch.motiu;
    const { error } = await supabase.from("reserves").update(p).eq("id", id);
    if (error) throw error;
  },

  /* ---------- Material ---------- */
  async actualitzaMaterial(codi, patch) {
    const p = {};
    if (patch.nom !== undefined) p.nom = patch.nom;
    if (patch.cat !== undefined) p.categoria = patch.cat;
    if (patch.marca !== undefined) p.marca = patch.marca;
    if (patch.unitats !== undefined) p.unitats = patch.unitats;
    if (patch.ubic !== undefined) p.ubicacio = patch.ubic;
    if (patch.estat !== undefined) p.estat = patch.estat;
    if (patch.codiBarres !== undefined) p.codi_barres = patch.codiBarres || null;
    if (patch.incidencia !== undefined) p.incidencia = patch.incidencia || null;
    const { error } = await supabase.from("material").update(p).eq("codi", codi);
    if (error) throw error;
  },
  async afegeixMaterial(m) {
    const { error } = await supabase.from("material").insert(matADB(m));
    if (error) throw error;
  },
  async esborraMaterial(codi) {
    const { error } = await supabase.from("material").delete().eq("codi", codi);
    if (error) throw error;
  },
  async importaMaterial(llista) {
    // UPSERT per codi: no toca estat ni incidència (es conserva què està prestat o en reparació)
    const { error } = await supabase.from("material").upsert(
      llista.map((m) => ({
        codi: m.codi, nom: m.nom, categoria: m.cat, marca: m.marca,
        unitats: m.unitats, ubicacio: m.ubic, codi_barres: m.codiBarres || null,
      })),
      { onConflict: "codi" }
    );
    if (error) throw error;
  },

  /* ---------- Espais i catàlegs ---------- */
  async desaEspais(espais) {
    const { error } = await supabase.from("espais").upsert(
      espais.map((e) => ({ nom: e.nom, equipament: e.equipament, fora_horari: !!e.foraHorari })),
      { onConflict: "nom" }
    );
    if (error) throw error;
  },
  async esborraEspai(nom) {
    const { error } = await supabase.from("espais").delete().eq("nom", nom);
    if (error) throw error;
  },
  async desaAssignatures(noms) {
    await supabase.from("assignatures").delete().neq("nom", "");
    const { error } = await supabase.from("assignatures").insert(noms.map((n) => ({ nom: n })));
    if (error) throw error;
  },
  async desaUsuaris(llista, rol) {
    const { error } = await supabase.from("usuaris").upsert(
      llista.map((u) => ({ email: u.email, nom: u.nom, rol, grup: u.grup || null })),
      { onConflict: "email" }
    );
    if (error) throw error;
  },
};
