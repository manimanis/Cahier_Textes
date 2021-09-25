const annee_scolaire = "2021/2022";

const enseignant = "Mohamed Anis MANI";

const classes = ["2TI", "4ECO", "4T"];

const groupes = ["Toute la classe", "Groupe 1", "Groupe 2"];

const emploi = [
  {
    day: 1,
    startTime: "08:00",
    endTime: "12:00",
    classe: "2TI",
    groupe: groupes[0]
  },
  {
    day: 2,
    startTime: "14:00",
    endTime: "17:00",
    classe: "4ECO",
    groupe: groupes[0]
  },
  {
    day: 3,
    startTime: "08:00",
    endTime: "12:00",
    classe: "2TI",
    groupe: groupes[0]
  },
  {
    day: 4,
    startTime: "14:00",
    endTime: "18:00",
    classe: "2TI",
    groupe: groupes[0]
  },
  {
    day: 5,
    startTime: "09:00",
    endTime: "12:00",
    classe: "4T",
    groupe: groupes[0]
  },
];

class Seance {
  constructor(obj = {}) {
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