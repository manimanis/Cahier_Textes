/* ========================================
   INDEX - Vue.js Application
   Attend loadConfig() avant de démarrer
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const yearParam = urlParams.get('year');

  loadConfig(yearParam).then(() => {
    startApp();
  }).catch(() => {
    startApp();
  });
});

function compareTime(t1, t2) {
  if (t1 > t2) return 1;
  if (t1 < t2) return -1;
  return 0;
}

function startApp() {
  new Vue({
    el: '#app',
    data: {
      seance: new Seance(),
      classes: classesObjects,
      groupes: groupes,
      jours: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
      emploi: emploi,
      alerts: [],
      annee_scolaire: annee_scolaire,
      enseignant: enseignant,
      seances: {},
      selectedClasse: "",
      emploi_tab: [],
      monthes: [],
      monthStartingDay: 7,
      loading: true,
      selectedYear: annee_scolaire,
      years: yearsList
    },
    mounted: function () {
      this.loading = false;
    },
    methods: {
      loadClasse: function (classe) {
        // Utiliser le fichier année_classe.json si config multi-années active
        const filename = yearsList.length > 0 ? `${this.annee_scolaire}_${classe}.json` : `${classe}.json`;
        return fetch(`json/${filename}`, { method: "GET" })
          .then(response => response.json())
          .then(data => {
            if (data == null) return null;
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
          .catch(() => null);
      },
      loadData: function (classe) {
        if (!classe) return;
        this.seances[classe] = [];
        return this.loadClasse(classe)
          .then(data => {
            if (data == null) return null;
            this.seances[classe] = data;
            this.$forceUpdate();
          });
      },
      onClasseChanged: function (classe) {
        document.title = "Cahier de textes - Classe " + classe;
        this.selectedClasse = classe;
        this.loadData(classe);
      },
      changeYear: function () {
        window.location.href = 'index.html?year=' + encodeURIComponent(this.selectedYear);
      }
    }
  });
}