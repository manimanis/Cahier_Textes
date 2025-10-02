function compareTime(t1, t2) {
  if (t1 > t2) return 1;
  if (t1 < t2) return -1;
  return 0;
}

const app = new Vue({
  el: '#app',
  data: {
    seance: new Seance(),
    classes: classesObjects,
    groupes: groupes,
    // 0: dim, 1: lun, 2: mar, 3: mer, 4: jeu, 5: ven, 6: sam
    jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    emploi: emploi,
    alerts: [],
    annee_scolaire: annee_scolaire,
    enseignant: enseignant,
    seances: {},
    selectedClasse: "",
    emploi_tab: [],
    monthes: [],
    monthStartingDay: 7
  },
  mounted: function () {
    const anneeScolaire = +annee_scolaire.substring(0, 4);
    let year = anneeScolaire, month = 9;
    for (let i = 0; i < 9; i++) {
      const monthObj = this.getMonth(year, month);
      if (monthObj.days[0].date.getDay() < this.monthStartingDay) {
        this.monthStartingDay = monthObj.days[0].date.getDay();
      }
      this.monthes.push(monthObj);
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    
    classes.forEach(classe => {
      this.loadClasse(classe)
        .then(data => {
          if (data == null) {
            return null;
          }
          data.forEach(seance => {
            const dt = new Date(seance.date);
            const numMonth = (dt.getMonth() - 8) + (dt.getFullYear() - anneeScolaire) * 12;
            this.monthes[numMonth].days[dt.getDate() - 1].obs += seance.classe + "<br>";
          });
        });
    });
    this.$forceUpdate();
  },
  methods: {
    /**
     * 
     * @param {json} data Le résultat d'un fetch
     */
    handleFetch: function (data) {
      if (data.status != 'ok') {
        throw data.errors;
      }
      return data;
    },
    /**
     * 
     * @param {String[]} errors 
     */
    handleErrors: function (errors) {
      for (let error of errors) {
        this.addAlertMessage('danger', error);
      }
    },
    loadClasse: function (classe) {
      return fetch(`json/${classe}.json`, {
        method: "GET"
      })
        .then(response => response.json())
        .then(data => {
          if (data == null) {
            return null;
          }
          const seances = data.map(s => new Seance(s));
          seances.sort((a, b) => {
            if (a.date > b.date) return 1;
            if (a.date < b.date) return -1;
            return 0;
          });
          seances.forEach((seance, idxSeance) => seance.index = (idxSeance + 1));
          seances.reverse();
          return seances;
        })
        .catch(error => {
          this.addAlertMessage('danger', `Erreur lors du chargement des données pour ${classe}!`);
        });
    },
    loadData: function (classe) {
      if (!classe) {
        return;
      }

      this.seances[classe] = [];

      return this.loadClasse(classe)
        .then(data => {
          if (data == null) {
            return null;
          }
          this.seances[classe] = data;
          this.$forceUpdate();
        });
    },
    onClasseChanged: function (classe) {
      document.title = "Cahier de textes - Classe " + classe;
      this.selectedClasse = classe;
      this.loadData(classe);
    },
    getMonth: function (year, month) {
      const debMois = new Date(year, month - 1, 1);
      const finMois = new Date(year + ((month == 12) ? 1 : 0), (month == 12) ? 0 : month, 1);
      let currTime = debMois.getTime();
      const thisMonth = {
        "name": debMois.toLocaleString('fr-FR', { month: 'long' }) + " " + year,
        "days": []
      };
      while (currTime < finMois.getTime()) {
        const date = new Date(currTime);
        currTime += 3600 * 24 * 1000;
        thisMonth.days.push({
          "date": date,
          "dayName": date.toLocaleString('fr-FR', { weekday: 'long' }),
          "obs": ""
        });
      }
      return thisMonth;
    }
  }
});
