import { formatDate } from './defaults';
import { BRANCHES_THEORIE } from './fsvl';
import { estPaye } from './paiements';
import { calculerProgression } from './progress';
import type { AppData, Eleve, Vol } from './types';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Vols du carnet : uniquement les vols validés par un moniteur, du plus ancien au plus récent. */
export function volsDuCarnet(eleveId: string, vols: Vol[]): Vol[] {
  return vols
    .filter((v) => v.eleveId === eleveId && estPaye(v))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * Carnet de vol de l'élève au format HTML (A4), converti en PDF par l'application.
 * Contient le résumé de progression, la liste des vols validés, les compétences
 * et les cases de signature pour l'inscription à l'examen.
 */
export function carnetHtml(eleve: Eleve, data: AppData, dateExport: string): string {
  const { reglages } = data;
  const site = (id?: string) => reglages.sites.find((s) => s.id === id);
  const nomSite = (id?: string) => {
    const s = site(id);
    return s ? `${esc(s.nom)} <span class="alt">${s.altitude} m</span>` : '—';
  };
  const moniteur = (id?: string) => {
    const m = data.moniteurs.find((x) => x.id === id);
    return m ? `${m.prenom} ${m.nom}`.trim() : '—';
  };
  const p = calculerProgression(eleve, data.vols, data.validations, reglages.exigences, reglages.etapes);
  const vols = volsDuCarnet(eleve.id, data.vols);

  let cumulPente = 0;
  let cumulGrands = 0;
  const lignesVols = vols
    .map((v, i) => {
      if (v.type === 'pente') cumulPente += v.nombre;
      else cumulGrands += v.nombre;
      return `<tr>
        <td class="num">${i + 1}</td>
        <td>${formatDate(v.date)}</td>
        <td>${v.type === 'altitude' ? 'Grand vol' : 'Pente école'}</td>
        <td class="num">${v.nombre}</td>
        <td class="num">${v.type === 'altitude' ? cumulGrands : cumulPente}</td>
        <td class="num">${v.navettes ?? ''}</td>
        <td>${nomSite(v.decollageId)}</td>
        <td>${nomSite(v.atterrissageId)}</td>
        <td>${esc(moniteur(v.paiement?.moniteurId ?? v.moniteurId))}</td>
        <td class="rem">${esc(v.remarques)}</td>
      </tr>`;
    })
    .join('');

  const validation = (competenceId: string) =>
    data.validations.find((x) => x.eleveId === eleve.id && x.competenceId === competenceId);
  const lignesCompetences = reglages.etapes
    .map(
      (e) =>
        `<tr class="etape"><td colspan="3">${esc(e.titre)}</td></tr>` +
        e.competences
          .map((c) => {
            const v = validation(c.id);
            const etat = v?.niveau === 'acquis' ? '✔ Acquis' : v?.niveau === 'vu' ? 'Vu' : '—';
            return `<tr><td>${esc(c.libelle)}</td><td>${etat}</td><td>${v ? `${formatDate(v.date)} · ${esc(moniteur(v.moniteurId))}` : ''}</td></tr>`;
          })
          .join(''),
    )
    .join('');

  const resume = `<div class="crit">
        <div class="lib">Pente école</div>
        <div class="val">${p.volsPente} <small>vols</small></div>
        <div class="etat">&nbsp;</div>
      </div>` + p.criteres
    .map(
      (c) => `<div class="crit ${c.ok ? 'ok' : ''}">
        <div class="lib">${esc(c.libelle)}</div>
        <div class="val">${c.actuel} <small>/ ${c.requis}</small></div>
        <div class="etat">${c.ok ? '✔ atteint' : 'en cours'}</div>
      </div>`,
    )
    .join('');

  const theorie = BRANCHES_THEORIE.map(
    (b) => `<li>${eleve.examenTheorique.branches[b.id] ? '☑' : '☐'} ${esc(b.libelle)}</li>`,
  ).join('');

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<title>Carnet de vol – ${esc(eleve.prenom)} ${esc(eleve.nom)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; color: #14202B; font-size: 10pt; margin: 0; }
  h1 { font-size: 18pt; margin: 0; }
  h2 { font-size: 12pt; margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 1.5px solid #0B6FB8; color: #084F84; }
  .entete { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0B6FB8; padding-bottom: 8px; }
  .ecole { font-size: 11pt; color: #5B6B7A; }
  .ident { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 16px; margin-top: 10px; }
  .ident div span { display: block; font-size: 8pt; color: #5B6B7A; text-transform: uppercase; letter-spacing: .04em; }
  .resume { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .crit { border: 1px solid #DCE4EC; border-radius: 6px; padding: 8px; }
  .crit.ok { border-color: #1E8E4E; }
  .crit .lib { font-size: 8.5pt; color: #5B6B7A; }
  .crit .val { font-size: 16pt; font-weight: 700; font-variant-numeric: tabular-nums; }
  .crit .val small { font-size: 10pt; color: #5B6B7A; font-weight: 400; }
  .crit .etat { font-size: 8pt; }
  .crit.ok .etat { color: #1E8E4E; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th, td { border: 1px solid #DCE4EC; padding: 3px 5px; text-align: left; vertical-align: top; }
  th { background: #EEF4FA; font-size: 8pt; text-transform: uppercase; letter-spacing: .03em; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.rem { color: #5B6B7A; }
  .alt { color: #5B6B7A; font-size: 7.5pt; white-space: nowrap; }
  tr.etape td { background: #F2F6FA; font-weight: 700; }
  ul.theorie { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 4px 18px; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 10px; page-break-inside: avoid; }
  .sig { border: 1px solid #14202B; border-radius: 4px; height: 80px; padding: 6px; font-size: 8.5pt; display: flex; flex-direction: column; justify-content: space-between; }
  .sig .ligne { border-top: 1px dotted #5B6B7A; padding-top: 2px; color: #5B6B7A; }
  .attest { margin-top: 12px; page-break-inside: avoid; }
  .pied { margin-top: 14px; font-size: 7.5pt; color: #5B6B7A; }
  .vide { color: #5B6B7A; font-style: italic; }
</style></head>
<body>
  <div class="entete">
    <div>
      <div class="ecole">${esc(reglages.ecoleNom)}</div>
      <h1>Carnet de vol – élève pilote parapente</h1>
    </div>
    <div class="ecole">Exporté le ${formatDate(dateExport)}</div>
  </div>

  <div class="ident">
    <div><span>Nom, prénom</span>${esc(eleve.nom)} ${esc(eleve.prenom)}</div>
    <div><span>Date de naissance</span>${formatDate(eleve.dateNaissance)}</div>
    <div><span>N° FSVL</span>${esc(eleve.numeroFSVL) || '—'}</div>
    <div><span>Début de formation</span>${formatDate(eleve.dateDebut)}</div>
    <div><span>Moniteur référent</span>${esc(moniteur(eleve.moniteurRefId))}</div>
    <div><span>Autorisation d’élève valable jusqu’au</span>${formatDate(eleve.permisEleveValidite)}</div>
  </div>

  <h2>Résumé de la formation</h2>
  <div class="resume">${resume}</div>

  <h2>Vols validés (${vols.length} entrées · ${p.volsPente} en pente école · ${p.grandsVols} grands vols)</h2>
  ${
    vols.length
      ? `<table>
    <thead><tr><th>N°</th><th>Date</th><th>Type</th><th>Vols</th><th>Cumul</th><th>Navettes</th><th>Décollage</th><th>Atterrissage</th><th>Moniteur</th><th>Remarques</th></tr></thead>
    <tbody>${lignesVols}</tbody>
  </table>`
      : '<p class="vide">Aucun vol validé.</p>'
  }

  <h2>Compétences</h2>
  <table>
    <thead><tr><th style="width:55%">Compétence</th><th style="width:12%">État</th><th>Validée le · par</th></tr></thead>
    <tbody>${lignesCompetences}</tbody>
  </table>

  <h2>Examen théorique</h2>
  <ul class="theorie">${theorie}</ul>

  <div class="attest">
    <h2>Attestation</h2>
    <p>Le moniteur soussigné atteste que les vols et compétences ci-dessus ont été effectués et validés
    sous sa responsabilité, conformément au programme de formation de l’école.</p>
    <div class="signatures">
      <div class="sig"><span>Lieu et date</span><span class="ligne">&nbsp;</span></div>
      <div class="sig"><span>Signature de l’élève</span><span class="ligne">${esc(eleve.prenom)} ${esc(eleve.nom)}</span></div>
      <div class="sig"><span>Signature du moniteur / chef d’école</span><span class="ligne">Nom :</span></div>
    </div>
  </div>

  <div class="pied">Document généré par l’application de l’école. Seuls les vols validés par un moniteur figurent dans ce carnet.</div>
</body></html>`;
}
