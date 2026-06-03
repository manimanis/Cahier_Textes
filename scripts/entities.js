/* ========================================
   ENTITIES - Configuration dynamique
   Charge les données depuis config.json
   ======================================== */

// Valeurs par défaut (fallback si serveur indisponible)
let annee_scolaire = "2025/2026";
let enseignant = "Mohamed Anis MANI";
let classes = ["2TI1", "2SC1", "3T1", "4T1", "others"];
let classesObjects = [
  { shortName: 'others', longName: "Autres" },
  { shortName: '2TI1', longName: "2<sup>e</sup> Tech. de l'informatique" },
  { shortName: '2SC1', longName: "2<sup>e</sup> Sciences" },
  { shortName: '3T1', longName: "3<sup>e</sup> Techniques" },
  { shortName: '4T1', longName: "4<sup>e</sup> Techniques" }
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
  const dt = new Date(date);
  return dt.toLocaleDateString('fr', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'});
}

/**
 * Charge la configuration depuis le serveur et met à jour les variables globales.
 * @param {string} [yearLabel] - Année à charger (sinon année courante)
 * @returns {Promise<object>} L'objet année chargé
 */
function loadConfig(yearLabel) {
  return fetch('operations.php?act=getconfig')
    .then(r => r.json())
    .then(data => {
      if (data.status !== 'ok' || !data.data || !data.data.config) {
        throw new Error('Config non disponible');
      }
      const config = data.data.config;
      let year = null;

      if (yearLabel) {
        year = config.years.find(y => y.label === yearLabel);
      }
      if (!year) {
        year = config.years.find(y => y.isCurrent) || config.years[config.years.length - 1] || null;
      }

      yearsList = config.years || [];

      // Charger les infos enseignant depuis config.json
      if (config.enseignant) {
        const e = config.enseignant;
        enseignant = e.firstName + ' ' + e.name.toUpperCase() + ' (' + e.specialite + ')';
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
    })
    .catch(() => {
      // Fallback : garder les valeurs par défaut
      return null;
    });
}