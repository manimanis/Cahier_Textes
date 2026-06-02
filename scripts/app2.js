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
    connected: false,
    seances: [],
    dates: [],
    filteredSeances: [],
    selectedSeance: -1,
    mode: "list",
    originalSeance: null,
    localSeance: null,
    emploi_tab: [],
    loading: false,
    loginPseudo: '',
    loginPassword: '',
    authToken: ''
  },
  mounted: function () {
    // Check if previously logged in via session cookie
    this.checkSession();
  },
  methods: {
    /**
     * Check if the user has an active session
     */
    checkSession: function () {
      fetch('operations.php?act=authcheck')
        .then(response => response.json())
        .then(data => {
          if (data.data && data.data.authenticated) {
            this.connected = true;
          } else {
            this.connected = false;
          }
        })
        .catch(error => {
          this.connected = false;
        });
    },
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
      console.log(errors);
      for (let error of errors) {
        this.addAlertMessage('danger', error);
      }
    },
    onLoginClicked: function () {
      let formData = new URLSearchParams();
      formData.append('pseudo', this.loginPseudo);
      formData.append('password', this.loginPassword);

      fetch('operations.php?act=login', {
        method: "POST",
        body: formData
      })
        .then(response => response.json())
        .then(this.handleFetch)
        .then(data => {
          if (data) {
            this.authToken = data.data.token;
            this.connected = true;
            this.loadData(this.classe);
          }
        })
        .catch(errors => {
          this.handleErrors(errors);
        });
    },
    onLogoutClicked: function () {
      fetch('operations.php?act=logout', {
        method: "POST"
      })
        .then(response => response.json())
        .then(() => {
          this.authToken = '';
          this.connected = false;
          this.classe = "";
          this.seances = [];
          this.dates = [];
          this.filteredSeances = [];
          this.selectedSeance = -1;
          this.mode = "list";
          this.alerts = [];
        });
    },
    isConnected: function () {
      return fetch('operations.php?act=ping')
        .then(response => response.json())
        .then(data => data.data.ping == 'ok');
    },
    /**
     * Destroy Jodit editor instance to prevent memory leaks
     */
    destroyEditor: function () {
      if (this.editor && this.editor.destruct) {
        try {
          this.editor.destruct();
        } catch (e) {
          // Ignore destruction errors
        }
        this.editor = null;
      }
    },
    deleteSeance: function (seance) {
      let formData = new URLSearchParams();
      Object.entries(seance).forEach(arr => formData.append(arr[0], arr[1]));
      const headers = {};
      if (this.authToken) {
        headers['Authorization'] = 'Bearer ' + this.authToken;
      }
      return fetch(`operations.php?act=delete`, {
        method: "POST",
        body: formData,
        headers: headers
      })
        .then(response => response.json())
        .then(this.handleFetch)
        .catch(this.handleErrors)
        .then(data => {
          if (data == null) {
            return null;
          }
          return data;
        });
    },
    updateSeance: function (seance, nseance) {
      let formData = new URLSearchParams();
      if (this.editor) {
        nseance.travail = this.editor.value;
      }
      Object.entries(seance).forEach(arr => formData.append(arr[0], arr[1]));
      Object.entries(nseance).forEach(arr => formData.append("n" + arr[0], arr[1]));
      const headers = {};
      if (this.authToken) {
        headers['Authorization'] = 'Bearer ' + this.authToken;
      }
      return fetch(`operations.php?act=update`, {
        method: "POST",
        body: formData,
        headers: headers
      })
        .then(response => response.json())
        .then(this.handleFetch)
        .catch(this.handleErrors)
        .then(data => {
          if (data == null) {
            return null;
          }
          return data;
        });
    },
    insertData: function (seance) {
      let formData = new URLSearchParams();
      if (this.editor) {
        seance.travail = this.editor.value;
      }
      Object.entries(seance).forEach(arr => formData.append(arr[0], arr[1]));
      const headers = {};
      if (this.authToken) {
        headers['Authorization'] = 'Bearer ' + this.authToken;
      }
      return fetch(`operations.php?act=insert`, {
        method: "POST",
        body: formData,
        headers: headers
      })
        .then(response => response.json())
        .then(this.handleFetch)
        .catch(this.handleErrors)
        .then(data => {
          if (data == null) {
            return null;
          }
          return data;
        });
    },
    loadData: function (classe) {
      this.seances = [];
      this.dates = [];
      this.filteredSeances = [];
      this.debut = '';
      this.fin = '';

      if (!this.classes.includes(classe)) {
        return;
      }

      this.loading = true;

      return fetch(`json/${classe}.json`, {
        method: "GET"
      })
        .then(response => response.json())
        .catch(error => {
          this.addAlertMessage('danger', `Erreur lors du chargement des données pour ${classe}!`);
        })
        .then(data => {
          this.loading = false;
          if (data == null) {
            return null;
          }
          this.seances = data.map(s => new Seance(s));
          this.seances.sort((a, b) => {
            if (a.date > b.date) return 1;
            if (a.date < b.date) return -1;
            return 0;
          });
          this.seances.forEach((seance, idxSeance) => seance.index = (idxSeance + 1));
          this.seances.reverse();

          this.dates = this.seances.map(s => s.date);
          this.dates = this.dates.filter((dt, idx) => this.dates.indexOf(dt) == idx).reverse();
          this.debut = this.dates[0];
          this.fin = this.dates[this.dates.length - 1];
          this.filterSeances(this.debut, this.fin);
        });
    },
    filterSeances: function (debut, fin) {
      this.filteredSeances = this.seances.filter(s => s.date >= debut && s.date <= fin)
    },
    fillByDate: function (date) {
      const day = date.getDay();
      const seance = this.emploi.find(s => s.day == day);

      if (seance) {
        this.localSeance = new Seance({
          classe: seance.classe,
          debut: seance.startTime,
          fin: seance.endTime,
          groupe: seance.groupe,
          date: date.toISOString().substring(0, 10)
        });
      } else {
        this.localSeance = new Seance({
          date: date.toISOString().substring(0, 10)
        });
      }
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
    },
    onEditSeanceClicked: function (idx) {
      this.selectedSeance = idx;
      this.mode = "edit";
      this.originalSeance = new Seance(this.filteredSeances[idx]);
      this.initEditFormControls();
    },
    onConfirmDeleteSeanceClicked: function (idx) {
      this.selectedSeance = idx;
      this.mode = "delete";
    },
    onNewSeanceclicked: function () {
      this.mode = 'new';
      this.fillByDate(new Date());
      this.initEditFormControls();
    },
    initEditFormControls: function () {
      // Destroy previous editor instance first to prevent memory leaks
      this.destroyEditor();

      this.$nextTick(() => {
        try {
          this.editor = Jodit.make('#edit-travail-seance', {
            height: 400,
            language: 'fr'
          });
        } catch (e) {
          // Fallback: try new form editor
          try {
            this.editor = Jodit.make('#new-travail-seance', {
              height: 400,
              language: 'fr'
            });
          } catch (e2) {
            // Editor not available
          }
        }
      });
    },
    onModifySeanceClicked: function () {
      this.updateSeance(this.originalSeance, this.filteredSeances[this.selectedSeance])
        .then(data => {
          if (data != null) {
            this.loadData(this.classe);
            this.onCancelClicked();
          }
        });
    },
    onDeleteSeanceClicked: function () {
      this.deleteSeance(this.filteredSeances[this.selectedSeance])
        .then(data => {
          if (data != null) {
            this.loadData(this.classe)
              .then(() => {
                this.onCancelClicked();
              });
          }
        });
    },
    onInsertClicked: function () {
      this.insertData(this.localSeance)
        .then(data => {
          if (data != null) {
            this.loadData(this.classe)
              .then(() => {
                this.onCancelClicked();
              });
          }
        });
    },
    onCancelClicked: function () {
      // Destroy editor on cancel to free memory
      this.destroyEditor();

      if (this.mode == 'edit') {
        // FIXED: was `this.filterSeances` (typo) instead of `this.filteredSeances`
        this.filteredSeances[this.selectedSeance] = this.originalSeance;
      }
      this.mode = "list";
      this.selectedSeance = -1;
    },
    onDateChanged: function () {
      this.fillByDate(new Date(this.seance.date));
    }
  }
});