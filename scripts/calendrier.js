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
      years: yearsList,
      isStatic: isStaticEnvironment,
      activeDay: null
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
        // 10 mois : Septembre à Juin
        for (let i = 0; i < 10; i++) {
          this.months.push(this.createMonth(year, month));
          month++;
          if (month > 12) { month = 1; year++; }
        }

        const allClasses = [...new Set([...classes, 'others'])];
        Promise.all(allClasses.map(c =>
          loadSeancesData(this.annee_scolaire, c).then(seances => {
            if (!seances) return;
            seances.forEach(s => {
              const dt = new Date(s.date + 'T00:00:00');
              const mi = (dt.getMonth() - 8) + (dt.getFullYear() - annee) * 12;
              if (this.months[mi]) {
                const di = dt.getDate() - 1;
                if (this.months[mi].days[di]) {
                  const dayObj = this.months[mi].days[di];
                  if (!dayObj.seances) dayObj.seances = [];
                  dayObj.seances.push(s);
                  const isSpecial = s.classe === 'others' || s.classe.includes('JF') || s.classe.includes('Réu');
                  const tagCls = isSpecial ? 'cal-tag bg-warning text-dark' : 'cal-tag';
                  dayObj.obs += `<span class="${tagCls}" title="${s.titre || s.classe}">${s.classe}</span> `;
                }
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
          mo.days.push({ date: dt, dow: dt.toLocaleString('fr-FR', { weekday: 'long' }).substring(0, 3), obs: '', seances: [] });
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
      onDayClicked(day) {
        if (day && day.seances && day.seances.length > 0) {
          this.activeDay = day;
          if (typeof $ !== 'undefined') {
            $('#modalDayDetails').modal('show');
          }
        }
      },
      formatDate(d) {
        if (!d) return '';
        const dt = new Date(d);
        return dt.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      },
      changeYear() {
        window.location.href = 'calendrier.html?year=' + encodeURIComponent(this.selectedYear);
      }
    }
  });
}