const timetable = document.querySelector('.timetable-wrapper .content')
const unit = timetable.querySelector(':scope > div')
const ttDimensions = timetable.getBoundingClientRect()
const unitWidth = unit.getBoundingClientRect().width

const editModal = document.querySelector('#editmodal')
const titleInput = editModal.querySelector('input[name="name"]')
const startInput = editModal.querySelector('input[name="start_time"]')
const endInput = editModal.querySelector('input[name="end_time"]')
const weekInput = editModal.querySelector('select[name="day_of_week_"]')
const realWeekInput = editModal.querySelector('input[name="day_of_week"]')

function stringToColor(str) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	let colour = '#';
	for (let i = 0; i < 3; i++) {
		const value = (hash >> (i * 8)) & 0xFF;
		colour += ('00' + value.toString(16)).substr(-2);
	}
	return colour;
}

function generateTimetable(data) {
	data.map((day, i) => {
		day.map((event, j) => {
			const eventEl = document.createElement('div')
			eventEl.style.position = 'absolute'
			eventEl.style.top = (ttDimensions.y + event.start_time * ttDimensions.height / 24) + 'px'
			eventEl.style.left = (ttDimensions.x + unitWidth * i) + 'px'
			eventEl.style.height = ((event.end_time - event.start_time) * ttDimensions.height / 24) + 'px'
			eventEl.style.width = unitWidth-10 + 'px'
			eventEl.style.background = stringToColor(event.name) + '22'
			eventEl.innerHTML = `<p>${event.name}</p>`
			eventEl.classList.add('event')
			eventEl.classList.add('flex')
			eventEl.addEventListener('click', () => {
				titleInput.value = event.name
				startInput.value = event.start_time
				endInput.value = event.end_time
				weekInput.value = i
				realWeekInput.value = i
				openModal('editmodal')
			})
			timetable.append(eventEl)
		})
	})
}

generateTimetable(events)

function openModal(id) {
	const element = document.getElementById(id);
	element.classList.add("is-active");
}

function closeModal(id) {
	const element = document.getElementById(id);
	element.classList.remove("is-active");
}

const week = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday"
]

const proposalList = document.querySelector('section.proposals ul')
setInterval(async () => {
	let modifications = await fetch('https://tiiime.now.sh/get-proposals')
		.then(res => res.json())
	proposalList.innerHTML = ''
	for (const mod of modifications) {
		const el = document.createElement('div')
		el.innerHTML = `
			<p>${mod.proposer} wants to ${mod.type} ${mod.name}</p>
			<p>From ${mod.start_time} to ${mod.end_time} on ${week[mod.day_of_week]}</p>
			<form method="POST" action="/action-${mod.type}">
				<input type="hidden" name="name" value="${mod.name}">
				<input type="hidden" name="start_time" value="${mod.start_time}">
				<input type="hidden" name="end_time" value="${mod.end_time}">
				<input type="hidden" name="day_of_week" value="${mod.day_of_week}">
				<input type="hidden" name="timeid" value="${mod.timeid}">
				<input style="background:none;border:none" type="submit" name="${mod.type}" value="️✔️">
			</form>
			<form method="POST" action="/dismiss">
				<input type="hidden" name="timeid" value="${mod.timeid}">
				<input style="background:none;border:none" type="submit" value="❌">
			</form>
		`;
		proposalList.append(el)
	}
}, 10000);
