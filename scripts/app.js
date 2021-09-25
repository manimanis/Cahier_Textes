const app = new Vue({
	el: '#app',
	data: {
		seance: new Seance(),
		classes: ["2TI", "4ECO", "4T"],
		groupes: groupes,
		// 0: dim, 1: lun, 2: mar, 3: mer, 4: jeu, 5: ven, 6: sam
		emploi: emploi,
		alerts: []
	},
	mounted: function () {
		this.fillByDate(new Date());
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
		insertData: function (seance) {
			let formData = new URLSearchParams();
			Object.entries(seance).forEach(arr => formData.append(arr[0], arr[1]));
			return fetch(`operations.php?act=insert`, {
				method: "POST",
				body: formData
			})
				.then(response => response.json())
				.then(this.handleFetch)
				.catch(this.handleErrors)
				.then(data => {
					if (data == null) {
						return null;
					}
					this.fillByDate(new Date());
					this.resetForm();
					return data;
				});
		},
		fillByDate: function (date) {
			const day = date.getDay();
			const seance = this.emploi.find(s => s.day == day);

			if (seance) {
				this.seance = new Seance({
					classe: seance.classe,
					debut: seance.startTime,
					fin: seance.endTime,
					groupe: seance.groupe,
					date: date.toISOString().substring(0, 10)
				});
			} else {
				this.seance = new Seance({
					date: date.toISOString().substring(0, 10)
				});
			}
		},
		validateForm: function () {
			const form = document.querySelector('#form-seance');
			// form.classList.remove('was-validated');
			const isValid = form.checkValidity();
			form.classList.add('was-validated');
			return isValid;
		},
		resetForm: function () {
			const form = document.querySelector('#form-seance');
			form.classList.remove('was-validated');
		},
		onDateChanged: function () {
			this.fillByDate(new Date(this.seance.date));
		},
		onInsertClicked: function () {
			if (this.validateForm()) {
				this.insertData(this.seance);
			}
		}
	}
});