const annee_scolaire = "2025/2026";

const enseignant = "Mohamed Anis MANI";

const classes = ["2TI1", "2SC1", "3T1", "4T1", "others"];

const classesObjects = [
  {
    shortName : 'others',
    longName: "Autres"
  },
  {
    shortName : '2TI1',
    longName: "2<sup>e</sup> Tech. de l'informatique"
  },
  {
    shortName : '2SC1',
    longName: "2<sup>e</sup> Sciences"
  },
  {
    shortName : '3T1',
    longName: "3<sup>e</sup> Techniques"
  },
  {
    shortName : '4T1',
    longName: "4<sup>e</sup> Techniques"
  }
];

const groupes = ["Toute la classe", "Groupe 1", "Groupe 2"];

const emploi = [
  {
    day: 4,
    startTime: "10:00",
    endTime: "12:00",
    classe: "2SC1",
    groupe: groupes[0]
  },
  {
    day: 1,
    startTime: "14:00",
    endTime: "17:00",
    classe: "4T1",
    groupe: groupes[0]
  },
  {
    day: 2,
    startTime: "14:00",
    endTime: "17:00",
    classe: "3T1",
    groupe: groupes[0]
  },
  {
    day: 3,
    startTime: "08:00",
    endTime: "12:00",
    classe: "2TI1",
    groupe: groupes[0]
  },
  {
    day: 2,
    startTime: "10:00",
    endTime: "12:00",
    classe: "2TI1",
    groupe: groupes[0]
  },
  {
    day: 6,
    startTime: "08:00",
    endTime: "12:00",
    classe: "2TI1",
    groupe: groupes[0]
  }
];

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