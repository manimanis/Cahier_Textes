/* ========================================
   EMPLOI DU TEMPS - Vue.js Application
   Grille 8h→18h - Générique (tous noms de classes)
   ======================================== */

// Palette de 8 couleurs pour classes (attribuées dans l'ordre)
const CLASS_PALETTE = [
  { bg: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', color: '#6c5ce7' },
  { bg: 'linear-gradient(135deg, #00b894, #55efc4)', color: '#00b894' },
  { bg: 'linear-gradient(135deg, #0984e3, #74b9ff)', color: '#0984e3' },
  { bg: 'linear-gradient(135deg, #e17055, #fab1a0)', color: '#e17055' },
  { bg: 'linear-gradient(135deg, #fdcb6e, #ffeaa7)', color: '#fdcb6e' },
  { bg: 'linear-gradient(135deg, #e84393, #fd79a8)', color: '#e84393' },
  { bg: 'linear-gradient(135deg, #00cec9, #81ecec)', color: '#00cec9' },
  { bg: 'linear-gradient(135deg, #636e72, #b2bec3)', color: '#636e72' }
];

const app = new Vue({
  el: '#app',
  data: {
    enseignant: enseignant,
    annee_scolaire: annee_scolaire,
    jours: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
    emploi: emploi
  },
  computed: {
    days() {
      return [
        { col: 2, index: 1, label: 'Lun', fullLabel: 'Lundi' },
        { col: 3, index: 2, label: 'Mar', fullLabel: 'Mardi' },
        { col: 4, index: 3, label: 'Mer', fullLabel: 'Mercredi' },
        { col: 5, index: 4, label: 'Jeu', fullLabel: 'Jeudi' },
        { col: 6, index: 5, label: 'Ven', fullLabel: 'Vendredi' },
        { col: 7, index: 6, label: 'Sam', fullLabel: 'Samedi' }
      ];
    },
    hours() { return [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]; },

    // Determine unique class names from the data (dynamic!)
    uniqueClasses() {
      const cls = [...new Set(this.emploi.map(s => s.classe))];
      return cls.sort((a, b) => {
        if (a === 'others') return 1;
        if (b === 'others') return -1;
        return a.localeCompare(b);
      });
    },

    // Build a map: className -> { bg, color } (assigned in order of appearance)
    classStyleMap() {
      const map = {};
      let idx = 0;
      this.uniqueClasses.forEach(cls => {
        const palette = CLASS_PALETTE[idx % CLASS_PALETTE.length];
        map[cls] = palette;
        idx++;
      });
      return map;
    },

    totalSessions() { return this.emploi.length; },
    totalHours() {
      let t = 0;
      this.emploi.forEach(s => t += (this._min(s.endTime) - this._min(s.startTime)) / 60);
      return t;
    },

    allCells() {
      const occupied = {};
      const cells = [];
      const isOccupied = (r, c) => occupied[r + '-' + c] === true;
      const activePerCol = {};

      // Header row
      cells.push({ id: 'h0', type: 'corner', row: 1, col: 1, rowspan: 1, colspan: 1 });
      this.days.forEach(day => {
        cells.push({
          id: 'h' + day.col, 
          type: 'header', 
          row: 1, col: day.col,
          rowspan: 1, colspan: 1, 
          label: day.label, 
          fullLabel: day.fullLabel
        });
      });

      this.hours.forEach((hour, idx) => {
        const gridRow = idx + 2;

        cells.push({
          id: 't' + hour, 
          type: 'time', 
          row: gridRow, 
          col: 1,
          rowspan: 1, 
          colspan: 1, 
          hour: hour,
          label: hour + 'h - ' + (hour + 1) + 'h'
        });
        occupied[gridRow + '-1'] = true;

        this.days.forEach(day => {
          const col = day.col;
          if (isOccupied(gridRow, col) || (activePerCol[col] && activePerCol[col].untilRow >= gridRow)) return;

          const slotS = hour * 60;
          const slotE = (hour + 1) * 60;
          const matching = this.emploi.filter(s => {
            if (s.day !== day.index) return false;
            const ss = this._min(s.startTime);
            const se = this._min(s.endTime);
            return ss < slotE && se > slotS;
          });

          if (matching.length === 0) {
            cells.push({ id: 'e' + gridRow + '-' + col, type: 'empty', row: gridRow, col: col, rowspan: 1, colspan: 1 });
            return;
          }

          const session = matching[0];
          const sStart = this._min(session.startTime);
          const sEnd = this._min(session.endTime);
          const startHour = Math.floor(sStart / 60);

          if (hour !== startHour) return;

          const minutes = sEnd - sStart;
          const rowspan = Math.max(1, Math.ceil(minutes / 60));
          activePerCol[col] = { untilRow: gridRow + rowspan - 1 };

          cells.push({
            id: 's' + gridRow + '-' + col, 
            type: 'session',
            row: gridRow, col: col, 
            rowspan: rowspan, colspan: 1,
            classe: session.classe,
            startTime: session.startTime, 
            endTime: session.endTime,
            groupe: session.groupe === 'Toute la classe' ? '' : session.groupe
          });
        });
      });

      return cells;
    }
  },
  methods: {
    getDayName(i) { return this.jours[i] || ''; },
    _min(t) { if (!t) return 0; const p = t.split(':').map(Number); return p[0] * 60 + (p[1] || 0); },
    getSessionsByClass(classe) {
      return this.emploi.filter(s => s.classe === classe)
        .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
    },
    getClassStyle(classe) {
      const s = this.classStyleMap[classe];
      return s ? s.bg : 'linear-gradient(135deg, #dfe6e9, #b2bec3)';
    },
    getClassColor(classe) {
      const s = this.classStyleMap[classe];
      return s ? s.color : '#636e72';
    },
    getClasseDisplay(classe) {
      return classe === 'others' ? 'Autres' : classe;
    }
  }
});