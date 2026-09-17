/* ========================================
   ENTITIES - Configuration dynamique & Hybride
   Supporte la consultation statique directe (GitHub Pages)
   et le mode édition dynamique (XAMPP / PHP)
   ======================================== */

// Détection de l'environnement (GitHub Pages, file://, etc.)
const isStaticEnvironment = (
  window.location.hostname.includes('github.io') ||
  window.location.protocol === 'file:' ||
  window.location.search.includes('mode=static')
);

// Variables globales (mises à jour dynamiquement par loadConfig)
let annee_scolaire = "2026/2027";
let enseignant = "Mohamed Anis MANI (Informatique)";
let enseignantObj = null;
let classes = ["3T2", "2SC2", "3SI2", "4SC2"];
let classesObjects = [
  { shortName: '3T2', longName: "3<sup>e</sup> Techniques 2" },
  { shortName: '2SC2', longName: "2<sup>e</sup> Sciences 2" },
  { shortName: '3SI2', longName: "3<sup>e</sup> Sciences de l'informatique 2" },
  { shortName: '4SC2', longName: "4<sup>e</sup> Sciences 2" }
];
let groupes = ["Toute la classe", "Groupe 1", "Groupe 2"];
let emploi = [];
let yearsList = []; // Liste de toutes les années (pour sélecteur)

class Seance {
  constructor(obj = {}) {
    this.index = obj.index || 0;
    this.titre = obj.titre || '';
    this.classe = obj.classe || '';
    this.date = obj.date || '';
    this.debut = obj.debut || '';
    this.fin = obj.fin || '';
    this.groupe = obj.groupe || '';
    this.travail = obj.travail || '';
    this.remarque = obj.remarque || '';
  }
}

function formatDate(date) {
  if (!date) return '';
  const dt = new Date(date + 'T00:00:00');
  return dt.toLocaleDateString('fr-FR', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateShort(date) {
  if (!date) return '';
  const dt = new Date(date + 'T00:00:00');
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Vérifie si le backend PHP (operations.php) est accessible
 * @returns {Promise<boolean>}
 */
async function checkBackendAvailable() {
  if (isStaticEnvironment) return false;
  try {
    const res = await fetch('operations.php?act=ping', { method: 'GET', cache: 'no-cache' });
    if (!res.ok) return false;
    const json = await res.json();
    return json && json.status === 'ok';
  } catch (e) {
    return false;
  }
}

/**
 * Applique les données de configuration aux variables globales
 * @param {object} config - Objet configuration issu de config.json
 * @param {string} [yearLabel] - Année souhaitée
 * @returns {object|null}
 */
function applyConfig(config, yearLabel) {
  if (!config) return null;

  yearsList = config.years || [];

  // Informations enseignant
  if (config.enseignant) {
    enseignantObj = config.enseignant;
    const e = config.enseignant;
    enseignant = (e.firstName || '') + ' ' + (e.name || '').toUpperCase() + (e.specialite ? ' (' + e.specialite + ')' : '');
  }

  // Sélection de l'année
  let year = null;
  if (yearLabel) {
    year = yearsList.find(y => y.label === yearLabel);
  }
  if (!year) {
    year = yearsList.find(y => y.isCurrent) || yearsList[yearsList.length - 1] || null;
  }

  if (year) {
    annee_scolaire = year.label;
    classes = year.classes || [];
    groupes = year.groupes || ["Toute la classe", "Groupe 1", "Groupe 2"];
    emploi = year.emploi || [];

    classesObjects = classes.map(cls => ({
      shortName: cls,
      longName: (year.classesDisplay && year.classesDisplay[cls]) || cls
    }));
  }

  return year;
}

/**
 * Charge la configuration depuis json/config.json (ou operations.php si échec)
 * @param {string} [yearLabel] - Année à charger (sinon année courante)
 * @returns {Promise<object>} L'objet année chargé
 */
function loadConfig(yearLabel) {
  // En priorité, lecture directe de json/config.json (fonctionne en local et sur GitHub Pages)
  return fetch('json/config.json', { cache: 'no-cache' })
    .then(r => {
      if (!r.ok) throw new Error('Fichier config.json non accessible : ' + r.status);
      return r.json();
    })
    .catch(() => {
      // Repli vers operations.php?act=getconfig si local
      return fetch('operations.php?act=getconfig', { cache: 'no-cache' })
        .then(r => r.json())
        .then(data => {
          if (data && data.status === 'ok' && data.data && data.data.config) {
            return data.data.config;
          }
          throw new Error('Config indisponible via PHP');
        });
    })
    .then(config => {
      return applyConfig(config, yearLabel);
    })
    .catch(err => {
      console.warn('Utilisation des valeurs par défaut :', err);
      return null;
    });
}

/**
 * Traite et trie une liste brute de séances
 * @param {Array} rawList
 * @returns {Array<Seance>}
 */
function processSeances(rawList) {
  if (!Array.isArray(rawList)) return [];
  const list = rawList.map(s => new Seance(s));
  // Tri chronologique croissant pour attribuer les numéros de séance (index)
  list.sort((a, b) => {
    if (a.date > b.date) return 1;
    if (a.date < b.date) return -1;
    return (a.debut || '').localeCompare(b.debut || '');
  });
  list.forEach((s, idx) => { s.index = idx + 1; });
  return list;
}

/**
 * Charge les séances d'une classe pour une année donnée
 * Compatible GitHub Pages (statique) et XAMPP (local)
 * @param {string} yearLabel
 * @param {string} classe
 * @returns {Promise<Array<Seance>>}
 */
async function loadSeancesData(yearLabel, classe) {
  if (!classe) return [];

  // Variantes de chemins pour fichiers statiques
  const pathsToTry = [
    `json/${yearLabel}_${classe}.json`, // e.g. json/2026/2027_2SC2.json
    `json/${yearLabel.replace('/', '_')}_${classe}.json`,
    `json/${classe}.json`
  ];

  if (classe.toLowerCase() === 'others') {
    pathsToTry.unshift(`json/${yearLabel}_others.json`, `json/others.json`);
  }

  for (const path of pathsToTry) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return processSeances(data);
        }
      }
    } catch (e) {
      // Essayer le chemin suivant
    }
  }

  // Repli PHP si disponible (en local XAMPP)
  try {
    const params = new URLSearchParams({ year: yearLabel, classe: classe });
    const res = await fetch(`operations.php?act=list&${params.toString()}`, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'ok' && Array.isArray(data.data.seances)) {
        return processSeances(data.data.seances);
      }
    }
  } catch (e) {}

  return [];
}