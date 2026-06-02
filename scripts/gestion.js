/* ========================================
   GESTION - Vue.js Application (Admin)
   Édition des classes et créneaux
   ======================================== */

document.addEventListener('DOMContentLoaded', function () {
  fetch('operations.php?act=authcheck')
    .then(r => r.json())
    .then(data => {
      startApp(data.data && data.data.authenticated);
    })
    .catch(() => startApp(false));
});

function startApp(isLoggedIn) {
  new Vue({
    el: '#app',
    data: {
      loading: true,
      isLoggedIn: isLoggedIn,
      loginPseudo: '',
      loginPassword: '',
      loginError: '',
      config: { years: [] },
      selectedYear: null,
      showCreateYear: false,
      newYearLabel: '',
      showEmploiEditor: false,
      showAddSlotForm: false,
      showAddClassForm: false,
      showEditClassForm: false,
      editingClassIndex: -1,
      editingSlotIndex: -1,
      newClassData: { name: '', display: '' },
      editClassData: { name: '', display: '' },
      editSlotData: { day: 1, startTime: '', endTime: '', classe: '', groupe: '' },
      newSlot: { day: 1, startTime: '08:00', endTime: '10:00', classe: '', groupe: 'Toute la classe' },
      jourNames: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    },
    mounted: function () {
      if (this.isLoggedIn) this.loadConfig();
      else this.loading = false;

      // Global keyboard: Enter = confirm, Escape = cancel for edit forms
      var self = this;
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (self.showAddClassForm || 
            self.showEditClassForm || 
            self.showAddSlotForm || 
            self.editingSlotIndex >= 0) {
            e.preventDefault();
          }
          if (self.showAddClassForm) {
            self.confirmAddClass();
          }
          if (self.showEditClassForm) {
            self.confirmEditClass();
          }
          if (self.showAddSlotForm) {
            self.confirmAddSlot();
          }
          if (self.editingSlotIndex >= 0) {
            self.confirmEditSlot();
          }
        }

        if (e.key === 'Escape') {
          if (self.showAddClassForm || 
            self.showEditClassForm || 
            self.showAddSlotForm || 
            self.editingSlotIndex >= 0) {
            e.preventDefault();
          }
          if (self.showAddClassForm) {
            self.cancelAddClass();
          }
          if (self.showEditClassForm) {
            self.cancelEditClass();
          }
          if (self.showAddSlotForm) {
            self.cancelAddSlot();
          }
          if (self.editingSlotIndex >= 0) {
            self.cancelEditSlot();
          }
        }
      });
    },
    methods: {
      loadConfig: function () {
        var self = this;
        fetch('operations.php?act=getconfig')
          .then(r => r.json())
          .then(data => {
            if (data.status === 'ok' && data.data && data.data.config) {
              self.config = data.data.config;
              // Sélectionner automatiquement l'année courante
              var currentYear = self.config.years.find(y => y.isCurrent);
              if (currentYear) {
                self.editYear(currentYear);
                self.editEmploi(currentYear);
              }
            }
            self.loading = false;
          })
          .catch(() => { self.loading = false; });
      },
      login: function () {
        var self = this;
        var fd = new URLSearchParams();
        fd.append('pseudo', this.loginPseudo);
        fd.append('password', this.loginPassword);
        fetch('operations.php?act=login', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(data => {
            if (data.status === 'ok') {
              self.isLoggedIn = true;
              self.loginError = '';
              self.loadConfig();
            } else {
              self.loginError = 'Identifiants incorrects';
            }
          })
          .catch(() => { self.loginError = 'Erreur de connexion'; });
      },
      createYear: function () {
        var self = this;
        if (!this.newYearLabel.trim()) return;
        var fd = new URLSearchParams();
        fd.append('label', this.newYearLabel.trim());
        fetch('operations.php?act=createyear', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(data => {
            if (data.status === 'ok') {
              self.loadConfig();
              self.showCreateYear = false;
              self.newYearLabel = '';
            } else {
              alert('Erreur : ' + (data.errors || 'Inconnue'));
            }
          });
      },
      editYear: function (year) {
        this.selectedYear = year;
        this.showEmploiEditor = false;
        this.showAddSlotForm = false;
        this.showAddClassForm = false;
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        this.editingSlotIndex = -1;
      },
      editEmploi: function (year) {
        this.selectedYear = year;
        this.showEmploiEditor = true;
        this.showAddSlotForm = false;
        this.showAddClassForm = false;
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        this.editingSlotIndex = -1;
      },
      setCurrentYear: function (label) {
        var self = this;
        var fd = new URLSearchParams();
        fd.append('label', label);
        fetch('operations.php?act=setcurrentyear', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(data => { if (data.status === 'ok') self.loadConfig(); });
      },
      // --- SAVE HELPERS ---
      saveClassesToServer: function () {
        var self = this;
        var fd = new URLSearchParams();
        fd.append('year', this.selectedYear.label);
        fd.append('classes', JSON.stringify(this.selectedYear.classes));
        fd.append('classesDisplay', JSON.stringify(this.selectedYear.classesDisplay));
        fetch('operations.php?act=updateclasses', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(data => {
            if (data.status !== 'ok') alert('Erreur lors de la sauvegarde');
            else self.loadConfig();
          });
      },
      // --- CLASSES ---
      openAddClassForm: function () {
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        this.newClassData = { name: '', display: '' };
        this.showAddClassForm = true;
      },
      confirmAddClass: function () {
        if (!this.newClassData.name.trim()) return;
        var name = this.newClassData.name.trim();
        var display = this.newClassData.display.trim() || name;
        this.selectedYear.classes.push(name);
        this.selectedYear.classesDisplay[name] = display;
        this.showAddClassForm = false;
        this.saveClassesToServer();
      },
      cancelAddClass: function () {
        this.showAddClassForm = false;
      },
      openEditClassForm: function (idx) {
        this.showAddClassForm = false;
        this.editingClassIndex = idx;
        var cls = this.selectedYear.classes[idx];
        this.editClassData = {
          name: cls,
          display: this.selectedYear.classesDisplay[cls] || cls
        };
        this.showEditClassForm = true;
      },
      confirmEditClass: function () {
        if (!this.editClassData.name.trim()) return;
        var oldName = this.selectedYear.classes[this.editingClassIndex];
        var newName = this.editClassData.name.trim();
        var newDisplay = this.editClassData.display.trim() || newName;

        // If name changed, update display map
        if (oldName !== newName) {
          delete this.selectedYear.classesDisplay[oldName];
          this.selectedYear.classesDisplay[newName] = newDisplay;
          this.selectedYear.classes[this.editingClassIndex] = newName;
        } else {
          this.selectedYear.classesDisplay[oldName] = newDisplay;
        }

        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        this.saveClassesToServer();
      },
      cancelEditClass: function () {
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
      },
      removeClass: function (idx) {
        if (!confirm('Supprimer la classe ' + this.selectedYear.classes[idx] + ' ?')) return;
        this.selectedYear.classes.splice(idx, 1);
        this.saveClassesToServer();
      },
      // --- EMPLOI DU TEMPS ---
      addEmploiSlot: function () {
        this.editingSlotIndex = -1;
        this.newSlot = {
          day: 1, startTime: '08:00', endTime: '10:00',
          classe: this.selectedYear.classes[0] || '',
          groupe: this.selectedYear.groupes[0] || 'Toute la classe'
        };
        this.showAddSlotForm = true;
      },
      confirmAddSlot: function () {
        this.selectedYear.emploi.push({ ...this.newSlot });
        this.showAddSlotForm = false;
      },
      cancelAddSlot: function () {
        this.showAddSlotForm = false;
      },
      openEditSlot: function (idx) {
        this.showAddSlotForm = false;
        this.editingSlotIndex = idx;
        this.editSlotData = { ...this.selectedYear.emploi[idx] };
      },
      confirmEditSlot: function () {
        Object.assign(this.selectedYear.emploi[this.editingSlotIndex], this.editSlotData);
        this.editingSlotIndex = -1;
      },
      cancelEditSlot: function () {
        this.editingSlotIndex = -1;
      },
      removeEmploiSlot: function (idx) {
        this.selectedYear.emploi.splice(idx, 1);
      },
      saveEmploi: function () {
        var self = this;
        var fd = new URLSearchParams();
        fd.append('year', this.selectedYear.label);
        fd.append('emploi', JSON.stringify(this.selectedYear.emploi));
        fetch('operations.php?act=updateschedule', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(data => {
            if (data.status === 'ok') {
              alert('✅ Emploi du temps enregistré !');
              self.loadConfig();
            } else {
              alert('Erreur : ' + (data.errors || 'Inconnue'));
            }
          });
      }
    }
  });
}