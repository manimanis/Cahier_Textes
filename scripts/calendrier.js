/* ========================================
   CALENDRIER DES SÉANCES - Vue.js Application
   2 mois par ligne via Bootstrap row/col
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

function startApp() {
  new Vue({
    el: '#app',
    data: {
      enseignant: enseignant,
      annee_scolaire: annee_scolaire,
      loading: true,
      months: [],
      selectedYear: annee_scolaire,
      years: yearsList
    },
    mounted() {
      const annee = +this.annee_scolaire.substring(0, 4);
      this.buildCalendar(annee);
    },
    computed: {
      monthPairs() {
        const pairs = [];
        for (let i = 0; i < this.months.length; i += 2) {
          const p = [this.months[i]];
          if (this.months[i + 1]) p.push(this.months[i + 1]);
          pairs.push(p);
        }
        return pairs;
      }
    },
    methods: {
      buildCalendar(annee) {
        this.months = [];
        let year = annee, month = 9;
        for (let i = 0; i < 9; i++) {
          this.months.push(this.createMonth(year, month));
          month++;
          if (month > 12) { month = 1; year++; }
        }

        const allClasses = classes.length > 0 ? classes : ["none"];
        Promise.all(allClasses.map(c =>
          fetch(`json/${this.annee_scolaire}_${c}.json`).then(r => r.json()).then(data => {
            if (!data) return;
            data.forEach(s => {
              const dt = new Date(s.date);
              const mi = (dt.getMonth() - 8) + (dt.getFullYear() - annee) * 12;
              if (this.months[mi]) {
                const di = dt.getDate() - 1;
                if (this.months[mi].days[di])
                  this.months[mi].days[di].obs += '<span class="cal-tag">' + s.classe + '</span> ';
              }
            });
          }).catch(() => null)
        )).then(() => {
          this.months.forEach(m => m.weeks = this.chunkWeeks(m));
          this.loading = false;
          this.$forceUpdate();
        }).catch(() => { this.loading = false; });
      },
      createMonth(y, m) {
        const d = new Date(y, m - 1, 1);
        const e = new Date(y + (m === 12 ? 1 : 0), m === 12 ? 0 : m, 1);
        const mo = { name: d.toLocaleString('fr-FR', { month: 'long' }) + ' ' + y, days: [] };
        for (let t = d.getTime(); t < e.getTime(); t += 864e5) {
          const dt = new Date(t);
          mo.days.push({ date: dt, dow: dt.toLocaleString('fr-FR', { weekday: 'long' }).substring(0, 3), obs: '' });
        }
        return mo;
      },
      chunkWeeks(mo) {
        const weeks = [];
        let cur = [];
        const sd = mo.days[0].date.getDay();
        for (let i = 0; i < (sd === 0 ? 6 : sd - 1); i++) cur.push(null);
        mo.days.forEach(d => { cur.push(d); if (cur.length === 7) { weeks.push(cur); cur = []; } });
        if (cur.length) { while (cur.length < 7) cur.push(null); weeks.push(cur); }
        return weeks;
      },
      cellCls(d) {
        if (!d) return 'cal-empty';
        const dd = d.date.getDay();
        const parts = [];
        if (dd === 0 || dd === 6) parts.push('cal-we');
        if (d.obs) parts.push('cal-jt');
        return parts.length ? parts.join(' ') : '';
      },
      changeYear() {
        window.location.href = 'calendrier.html?year=' + encodeURIComponent(this.selectedYear);
      }
    }
  });
}