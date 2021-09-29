const app = new Vue({
  el: '#app',
  data: {
    seance: new Seance(),
    classes: classesObjects,
    groupes: groupes,
    // 0: dim, 1: lun, 2: mar, 3: mer, 4: jeu, 5: ven, 6: sam
    emploi: emploi,
    alerts: [],
    annee_scolaire: annee_scolaire,
    enseignant: enseignant,
    seances: {},
    selectedClasse: ""
  },
  mounted: function () {
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
    loadData: function (classe) {
      if (!classe) {
        return;
      }

      this.seances[classe] = [];

      return fetch(`json/${classe}.json`, {
        method: "GET"
      })
        .then(response => response.json())
        //.then(this.handleFetch)
        .catch(error => {
          this.addAlertMessage('danger', `Erreur lors du chargement des données pour ${classe}!`);
        })
        .then(data => {
          if (data == null) {
            return null;
          }
          this.seances[classe] = data.map(s => new Seance(s));
          this.seances[classe].sort((a, b) => {
            if (a.date > b.date) return 1;
            if (a.date < b.date) return -1;
            return 0;
          });
          this.$forceUpdate();
        });
    },
    onClasseChanged: function (classe) {
      this.selectedClasse = classe;
      this.loadData(classe);
    },
  }
});