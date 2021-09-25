const app = new Vue({
  el: '#app',
  data: {
    seance: new Seance(),
    classes: classes,
    groupes: groupes,
    // 0: dim, 1: lun, 2: mar, 3: mer, 4: jeu, 5: ven, 6: sam
    emploi: emploi,
    alerts: [],
    annee_scolaire: annee_scolaire,
    enseignant: enseignant,
    classe: "",
    debut: '',
    fin: '',
    seances: [],
    dates: [],
    filteredSeances: []
  },
  mounted: function () {
    this.loadData(this.classe);
  },
  methods: {
    /**
     * Affiche un message d'alerte
     * @param {string} type 
     * @param {string} msg 
     */
    addAlertMessage: function (type, msg) {
      const idx = this.alerts.length;
      this.alerts.push({ alType: type, alMsg: msg });
      setTimeout(() => this.clearAlertMessage(0), 3000);
    },
    /**
     * Efface le message d'alerte d'indice indiqué
     * @param {number} idx
     */
    clearAlertMessage: function (idx) {
      this.alerts.splice(idx, 1);
    },
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
    loadData: function (classe) {
      this.seances = [];
      this.dates = [];
      this.filteredSeances = [];
      this.debut = '';
      this.fin = '';

      return fetch(`json/${classe}.json`, {
        method: "GET"
      })
        .then(response => response.json())
        //.then(this.handleFetch)
        .catch(error => {
          this.addAlertMessage('danger', `Erreur lors du chargement des données pour ${classe}!`);
        })
        .then(data => {
          console.log(data);
          if (data == null) {
            return null;
          }
          this.seances = data.map(s => new Seance(s));
          this.seances.sort((a, b) => {
            if (a.date > b.date) return 1;
            if (a.date < b.date) return -1;
            return 0;
          });
          this.dates = this.seances.map(s => s.date);
          this.dates = this.dates.filter((dt, idx) => this.dates.indexOf(dt) == idx);
          this.debut = this.dates[0];
          this.fin = this.dates[this.dates.length - 1];
          this.filterSeances(this.debut, this.fin);
        });
    },
    filterSeances: function (debut, fin) {
      this.filteredSeances = this.seances.filter(s => s.date >= debut && s.date <= fin)
    },
    onClasseChanged: function () {
      this.loadData(this.classe);
    },
    onIntervalChanged: function (flag) {
      if (flag == 'debut' && this.fin < this.debut) {
        this.fin = this.debut;
      }
      if (flag == 'fin' && this.fin < this.debut) {
        this.debut = this.fin;
      }
      this.filterSeances(this.debut, this.fin);
    }
  }
});