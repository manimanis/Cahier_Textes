/* ========================================
   CONFIG LOADER - Shared configuration service
   Charge la config depuis config.json via PHP
   ======================================== */

const ConfigService = {
  _config: null,
  _loading: null,

  /**
   * Load config from server. Returns a Promise.
   */
  load() {
    if (this._config) return Promise.resolve(this._config);
    if (this._loading) return this._loading;

    this._loading = fetch('operations.php?act=getconfig')
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ok' && data.data && data.data.config) {
          this._config = data.data.config;
          return this._config;
        }
        throw new Error('Failed to load config');
      })
      .catch(err => {
        console.warn('Config load failed, using defaults:', err);
        return null;
      });

    return this._loading;
  },

  /**
   * Get the current academic year
   */
  getCurrentYear() {
    if (!this._config || !this._config.years) return null;
    return this._config.years.find(y => y.isCurrent) || this._config.years[this._config.years.length - 1] || null;
  },

  /**
   * Get a year by label
   */
  getYear(label) {
    if (!this._config || !this._config.years) return null;
    return this._config.years.find(y => y.label === label) || null;
  },

  /**
   * Get all years
   */
  getYears() {
    return (this._config && this._config.years) || [];
  }
};