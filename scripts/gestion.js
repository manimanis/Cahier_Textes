/* ========================================
   GESTION - Vue.js Application (Admin)
   Édition des classes, créneaux et enseignant
   UI/UX modernisée : toasts, onglets, dashboard, dark mode
   ======================================== */

document.addEventListener('DOMContentLoaded', function () {
  checkBackendAvailable().then(avail => {
    if (!avail) {
      startApp(false, false);
      return;
    }
    fetch('operations.php?act=authcheck')
      .then(r => r.json())
      .then(data => {
        startApp(data.data && data.data.authenticated, true);
      })
      .catch(() => startApp(false, true));
  });
});

// ===== TOAST SYSTEM =====
function showToast(type, message, duration = 3000) {
  // Inject toast container if not exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const colors = {
    success: '#27ae60', error: '#c0392b', warning: '#f39c12', info: '#3498db'
  };
  const toast = document.createElement('div');
  toast.className = 'toast-notif';
  toast.style.cssText = 'background:' + colors[type] + ';color:#fff;padding:12px 18px;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.2);font-size:0.95rem;display:flex;align-items:center;gap:8px;min-width:280px;max-width:420px;animation:slideInRight 0.3s ease-out;';
  toast.innerHTML = '<span style="font-size:1.2rem;">' + (icons[type] || '') + '</span><span>' + message + '</span>';
  container.appendChild(toast);
  setTimeout(function () {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(function () { toast.remove(); }, 300);
  }, duration);
}

// Inject keyframes once
if (!document.getElementById('toast-keyframes')) {
  const style = document.createElement('style');
  style.id = 'toast-keyframes';
  style.textContent = '@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
  document.head.appendChild(style);
}

function startApp(isLoggedIn, backendAvailable) {
  new Vue({
    el: '#app',
    data: {
      loading: true,
      backendAvailable: (backendAvailable !== undefined) ? backendAvailable : true,
      isLoggedIn: isLoggedIn,
      loginPseudo: '',
      loginPassword: '',
      loginError: '',
      config: { years: [], enseignant: { name: '', firstName: '', specialite: '', id: '', matieres: [] } },
      selectedYear: null,
      activeTab: 'dashboard', // 'dashboard', 'teacher', 'years', 'classes', 'schedule'
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
      jourNames: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
      enseignantData: { id: '', name: '', firstName: '', specialite: '', matieresStr: '' },
      teacherSaveStatus: '',
      draggedClassIndex: -1,
      dragOverClassIndex: -1,
      darkMode: localStorage.getItem('gestion-dark-mode') === '1'
    },
    mounted: function () {
      var self = this;
      window.addEventListener('hashchange', function () {
        self.syncFromHash();
      });
      if (this.isLoggedIn) this.loadConfig();
      else this.loading = false;
      this.applyDarkMode();
    },
    computed: {
      // Statistiques pour le tableau de bord
      totalYears: function () { return this.config.years ? this.config.years.length : 0; },
      totalClasses: function () {
        if (!this.config.years) return 0;
        var total = 0;
        for (var i = 0; i < this.config.years.length; i++) {
          total += (this.config.years[i].classes || []).length;
        }
        return total;
      },
      totalSlots: function () {
        if (!this.config.years) return 0;
        var total = 0;
        for (var i = 0; i < this.config.years.length; i++) {
          total += (this.config.years[i].emploi || []).length;
        }
        return total;
      },
      currentYearLabel: function () {
        var cur = (this.config.years || []).find(function (y) { return y.isCurrent; });
        return cur ? cur.label : '—';
      },
      teacherFullName: function () {
        var e = this.config.enseignant;
        if (!e) return '—';
        var n = (e.firstName || '') + ' ' + (e.name || '');
        return n.trim() || '—';
      }
    },
    methods: {
      // --- DARK MODE ---
      toggleDarkMode: function () {
        this.darkMode = !this.darkMode;
        localStorage.setItem('gestion-dark-mode', this.darkMode ? '1' : '0');
        this.applyDarkMode();
      },
      applyDarkMode: function () {
        if (this.darkMode) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
      },

      // --- HASH ROUTING ---
      updateUrlHash: function () {
        var hash = '#' + this.activeTab;
        if (this.activeTab === 'classes' && this.selectedYear) {
          hash += '?year=' + encodeURIComponent(this.selectedYear.label);
        } else if (this.activeTab === 'schedule' && this.selectedYear && this.showEmploiEditor) {
          hash += '?year=' + encodeURIComponent(this.selectedYear.label);
        }
        if (window.location.hash !== hash) {
          window.location.hash = hash;
        }
      },
      syncFromHash: function () {
        var rawHash = window.location.hash || '';
        if (!rawHash || rawHash === '#') {
          this.activeTab = 'dashboard';
          var self = this;
          this.$nextTick(function () { self.renderChart(); });
          return;
        }

        var content = rawHash.replace(/^#/, '');
        var tab = content;
        var yearParam = null;

        if (content.indexOf('?') !== -1) {
          var parts = content.split('?');
          tab = parts[0];
          var qParams = new URLSearchParams(parts[1]);
          yearParam = qParams.get('year');
        } else if (content.indexOf('/') !== -1) {
          var slashParts = content.split('/');
          tab = slashParts[0];
          yearParam = decodeURIComponent(slashParts.slice(1).join('/'));
        }

        var validTabs = ['dashboard', 'teacher', 'years', 'classes', 'schedule'];
        if (validTabs.indexOf(tab) === -1) {
          tab = 'dashboard';
        }

        this.activeTab = tab;

        // Réinitialiser les sous-formulaires
        this.showCreateYear = false;
        this.showAddClassForm = false;
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        this.showAddSlotForm = false;
        this.editingSlotIndex = -1;

        if (yearParam && this.config && this.config.years) {
          var matchedYear = this.config.years.find(function (y) {
            return y.label === yearParam || y.label.replace(/\//g, '-') === yearParam;
          });
          if (matchedYear) {
            if (tab === 'classes') {
              this.editYear(matchedYear, false);
            } else if (tab === 'schedule') {
              this.editEmploi(matchedYear, false);
            }
          } else {
            this.selectedYear = null;
          }
        } else {
          if (tab === 'classes') {
            this.selectedYear = null;
          } else if (tab === 'schedule') {
            this.selectedYear = null;
            this.showEmploiEditor = false;
          } else {
            this.selectedYear = null;
          }
        }

        if (tab === 'dashboard') {
          var self = this;
          this.$nextTick(function () { self.renderChart(); });
        }
      },

      // --- TABS ---
      switchTab: function (tab) {
        this.activeTab = tab;
        // Réinitialiser les sous-formulaires
        this.showCreateYear = false;
        this.showAddClassForm = false;
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        this.showAddSlotForm = false;
        this.editingSlotIndex = -1;
        if (tab !== 'classes' && tab !== 'schedule') {
          this.selectedYear = null;
        } else if (!this.selectedYear && this.config.years) {
          // Si aucune année n'est sélectionnée, pré-sélectionner l'année courante si disponible
          var cur = this.config.years.find(function (y) { return y.isCurrent; });
          if (cur) {
            this.selectedYear = cur;
            if (tab === 'schedule') this.showEmploiEditor = true;
          }
        }
        if (tab === 'dashboard') {
          var self = this;
          this.$nextTick(function () { self.renderChart(); });
        }
        this.updateUrlHash();
      },
      goToClasses: function (year) {
        this.activeTab = 'classes';
        this.editYear(year);
      },
      goToSchedule: function (year) {
        this.activeTab = 'schedule';
        this.editEmploi(year);
      },
      unselectYear: function (tab) {
        this.selectedYear = null;
        if (tab === 'schedule') this.showEmploiEditor = false;
        this.activeTab = tab;
        this.updateUrlHash();
      },

      // --- LOAD ---
      loadConfig: function () {
        var self = this;
        fetch('operations.php?act=getconfig')
          .then(r => r.json())
          .then(function (data) {
            if (data.status === 'ok' && data.data && data.data.config) {
              self.config = data.data.config;
              // Charger les données enseignant
              if (self.config.enseignant) {
                var e = self.config.enseignant;
                self.enseignantData.id = e.id || '';
                self.enseignantData.name = e.name || '';
                self.enseignantData.firstName = e.firstName || '';
                self.enseignantData.specialite = e.specialite || '';
                self.enseignantData.matieresStr = (e.matieres || []).join(', ');
              } else {
                self.config.enseignant = { name: '', firstName: '', specialite: '', id: '', matieres: [] };
              }
              // Synchroniser avec le hash d'URL ou initialiser
              if (window.location.hash && window.location.hash !== '#') {
                self.syncFromHash();
              } else {
                var currentYear = self.config.years.find(function (y) { return y.isCurrent; });
                if (currentYear) {
                  self.selectedYear = currentYear;
                }
                self.activeTab = 'dashboard';
                self.$nextTick(function () { self.renderChart(); });
              }
            }
            self.loading = false;
          })
          .catch(function () { self.loading = false; });
      },

      // --- AUTH ---
      login: function () {
        var self = this;
        var fd = new URLSearchParams();
        fd.append('pseudo', this.loginPseudo);
        fd.append('password', this.loginPassword);
        fetch('operations.php?act=login', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(function (data) {
            if (data.status === 'ok') {
              self.isLoggedIn = true;
              self.loginError = '';
              showToast('success', 'Connexion réussie');
              self.loadConfig();
            } else {
              self.loginError = 'Identifiants incorrects';
              showToast('error', 'Identifiants incorrects');
            }
          })
          .catch(function () { showToast('error', 'Erreur de connexion'); });
      },
      logout: function () {
        var self = this;
        fetch('operations.php?act=logout', { method: 'POST' })
          .then(r => r.json())
          .then(function () {
            self.isLoggedIn = false;
            showToast('info', 'Déconnexion réussie');
          });
      },

      // --- ENSEIGNANT ---
      saveTeacher: function () {
        var self = this;
        self.teacherSaveStatus = 'Enregistrement...';
        var matieres = self.enseignantData.matieresStr
          .split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
        var fd = new URLSearchParams();
        fd.append('id', self.enseignantData.id || '');
        fd.append('name', self.enseignantData.name || '');
        fd.append('firstName', self.enseignantData.firstName || '');
        fd.append('specialite', self.enseignantData.specialite || '');
        fd.append('matieres', JSON.stringify(matieres));
        fetch('operations.php?act=updateteacher', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(function (data) {
            if (data.status === 'ok') {
              self.teacherSaveStatus = '✅ Enregistré !';
              showToast('success', 'Enseignant enregistré avec succès');
              self.loadConfig();
              setTimeout(function () { self.teacherSaveStatus = ''; }, 3000);
            } else {
              self.teacherSaveStatus = '❌ Erreur';
              showToast('error', (data.errors && data.errors.join(', ')) || 'Erreur');
              setTimeout(function () { self.teacherSaveStatus = ''; }, 3000);
            }
          })
          .catch(function () {
            self.teacherSaveStatus = '❌ Erreur réseau';
            showToast('error', 'Erreur réseau');
            setTimeout(function () { self.teacherSaveStatus = ''; }, 3000);
          });
      },

      // --- ANNÉES ---
      createYear: function () {
        var self = this;
        if (!this.newYearLabel.trim()) {
          showToast('warning', 'Veuillez saisir un libellé d\'année');
          return;
        }
        var fd = new URLSearchParams();
        fd.append('label', this.newYearLabel.trim());
        fetch('operations.php?act=createyear', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(function (data) {
            if (data.status === 'ok') {
              showToast('success', 'Année créée');
              self.loadConfig();
              self.showCreateYear = false;
              self.newYearLabel = '';
            } else {
              showToast('error', (data.errors && data.errors.join(', ')) || 'Erreur');
            }
          });
      },
      editYear: function (year, updateHash = true) {
        this.selectedYear = year;
        this.showEmploiEditor = false;
        this.showAddSlotForm = false;
        this.showAddClassForm = false;
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        this.editingSlotIndex = -1;
        if (updateHash) this.updateUrlHash();
      },
      editEmploi: function (year, updateHash = true) {
        this.selectedYear = year;
        this.showEmploiEditor = true;
        this.showAddSlotForm = false;
        this.showAddClassForm = false;
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        this.editingSlotIndex = -1;
        if (updateHash) this.updateUrlHash();
      },
      setCurrentYear: function (label) {
        var self = this;
        var fd = new URLSearchParams();
        fd.append('label', label);
        fetch('operations.php?act=setcurrentyear', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(function (data) {
            if (data.status === 'ok') {
              showToast('success', 'Année courante mise à jour');
              self.loadConfig();
            }
          });
      },
      removeYear: function (label) {
        if (!confirm('Supprimer l\'année ' + label + ' ? Toutes les séances seront supprimées !')) return;
        var self = this;
        var fd = new URLSearchParams();
        fd.append('label', label);
        fetch('operations.php?act=removeyear', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(function (data) {
            if (data.status === 'ok') {
              showToast('success', 'Année supprimée');
              self.loadConfig();
            } else {
              showToast('error', (data.errors && data.errors.join(', ')) || 'Erreur');
            }
          });
      },

      // --- CHART ---
      renderChart: function () {
        if (typeof Chart === 'undefined') {
          var self = this;
          setTimeout(function () { self.renderChart(); }, 200);
          return;
        }
        var canvas = document.getElementById('dashboardChart');
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var years = (this.config.years || []);
        var labels = [];
        var classesData = [];
        var slotsData = [];
        for (var i = 0; i < years.length; i++) {
          labels.push(years[i].label);
          classesData.push((years[i].classes || []).length);
          slotsData.push((years[i].emploi || []).length);
        }
        if (this._chart) this._chart.destroy();
        this._chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              { label: 'Classes', data: classesData, backgroundColor: 'rgba(108,92,231,0.7)', borderRadius: 4 },
              { label: 'Créneaux', data: slotsData, backgroundColor: 'rgba(0,184,148,0.7)', borderRadius: 4 }
            ]
          },
          options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
      },

      // --- SAVE HELPERS ---
      saveClassesToServer: function (successMsg) {
        var self = this;
        var fd = new URLSearchParams();
        fd.append('year', this.selectedYear.label);
        fd.append('classes', JSON.stringify(this.selectedYear.classes));
        fd.append('classesDisplay', JSON.stringify(this.selectedYear.classesDisplay));
        fetch('operations.php?act=updateclasses', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(function (data) {
            if (data.status !== 'ok') showToast('error', 'Erreur lors de la sauvegarde');
            else {
              showToast('success', successMsg || 'Classes enregistrées');
              self.loadConfig();
            }
          });
      },

      // --- RÉORGANISATION DES CLASSES ---
      moveClassUp: function (idx) {
        if (idx <= 0 || !this.selectedYear || !this.selectedYear.classes) return;
        var classes = this.selectedYear.classes;
        var item = classes.splice(idx, 1)[0];
        classes.splice(idx - 1, 0, item);
        this.saveClassesToServer('Ordre des classes mis à jour');
      },
      moveClassDown: function (idx) {
        if (!this.selectedYear || !this.selectedYear.classes || idx >= this.selectedYear.classes.length - 1) return;
        var classes = this.selectedYear.classes;
        var item = classes.splice(idx, 1)[0];
        classes.splice(idx + 1, 0, item);
        this.saveClassesToServer('Ordre des classes mis à jour');
      },
      onClassDragStart: function (e, idx) {
        this.draggedClassIndex = idx;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', idx);
      },
      onClassDragOver: function (e, idx) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (this.draggedClassIndex !== idx) {
          this.dragOverClassIndex = idx;
        }
      },
      onClassDragLeave: function (idx) {
        if (this.dragOverClassIndex === idx) {
          this.dragOverClassIndex = -1;
        }
      },
      onClassDrop: function (e, targetIdx) {
        e.preventDefault();
        var fromIdx = this.draggedClassIndex;
        this.draggedClassIndex = -1;
        this.dragOverClassIndex = -1;
        if (fromIdx === -1 || fromIdx === targetIdx || !this.selectedYear || !this.selectedYear.classes) return;
        var classes = this.selectedYear.classes;
        var item = classes.splice(fromIdx, 1)[0];
        classes.splice(targetIdx, 0, item);
        this.saveClassesToServer('Ordre des classes mis à jour');
      },
      onClassDragEnd: function () {
        this.draggedClassIndex = -1;
        this.dragOverClassIndex = -1;
      },

      // --- CLASSES ---
      openAddClassForm: function () {
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        this.newClassData = { name: '', display: '' };
        this.showAddClassForm = true;
      },
      confirmAddClass: function () {
        if (!this.newClassData.name.trim()) {
          showToast('warning', 'Veuillez saisir un nom de classe');
          return;
        }
        var name = this.newClassData.name.trim();
        var display = this.newClassData.display.trim() || name;
        this.selectedYear.classes.push(name);
        this.selectedYear.classesDisplay[name] = display;
        this.showAddClassForm = false;
        showToast('success', 'Classe ajoutée');
        this.saveClassesToServer();
      },
      cancelAddClass: function () { this.showAddClassForm = false; },
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
        if (!this.editClassData.name.trim()) {
          showToast('warning', 'Veuillez saisir un nom');
          return;
        }
        var oldName = this.selectedYear.classes[this.editingClassIndex];
        var newName = this.editClassData.name.trim();
        var newDisplay = this.editClassData.display.trim() || newName;
        if (oldName !== newName) {
          delete this.selectedYear.classesDisplay[oldName];
          this.selectedYear.classesDisplay[newName] = newDisplay;
          this.selectedYear.classes[this.editingClassIndex] = newName;
        } else {
          this.selectedYear.classesDisplay[oldName] = newDisplay;
        }
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
        showToast('success', 'Classe modifiée');
        this.saveClassesToServer();
      },
      cancelEditClass: function () {
        this.showEditClassForm = false;
        this.editingClassIndex = -1;
      },
      removeClass: function (idx) {
        var self = this;
        var name = this.selectedYear.classes[idx];
        if (!confirm('Supprimer la classe ' + name + ' ?')) return;
        this.selectedYear.classes.splice(idx, 1);
        showToast('success', 'Classe supprimée');
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
        this.selectedYear.emploi.push(Object.assign({}, this.newSlot));
        this.showAddSlotForm = false;
        showToast('success', 'Créneau ajouté');
      },
      cancelAddSlot: function () { this.showAddSlotForm = false; },
      openEditSlot: function (idx) {
        this.showAddSlotForm = false;
        this.editingSlotIndex = idx;
        this.editSlotData = Object.assign({}, this.selectedYear.emploi[idx]);
      },
      confirmEditSlot: function () {
        Object.assign(this.selectedYear.emploi[this.editingSlotIndex], this.editSlotData);
        this.editingSlotIndex = -1;
        showToast('success', 'Créneau modifié');
      },
      cancelEditSlot: function () { this.editingSlotIndex = -1; },
      removeEmploiSlot: function (idx) {
        this.selectedYear.emploi.splice(idx, 1);
        showToast('success', 'Créneau supprimé');
      },
      saveEmploi: function () {
        var self = this;
        var fd = new URLSearchParams();
        fd.append('year', this.selectedYear.label);
        fd.append('emploi', JSON.stringify(this.selectedYear.emploi));
        fetch('operations.php?act=updateschedule', { method: 'POST', body: fd })
          .then(r => r.json())
          .then(function (data) {
            if (data.status === 'ok') {
              showToast('success', 'Emploi du temps enregistré');
              self.loadConfig();
            } else {
              showToast('error', (data.errors && data.errors.join(', ')) || 'Erreur');
            }
          });
      }
    }
  });
}
