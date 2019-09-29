const path = require('path')
const express = require('express')
const passport = require('passport')
const auth = require('./auth')
const cookieParser = require('cookie-parser')
const cookieSession = require('cookie-session')
const bodyParser = require('body-parser')
const fetch = require('node-fetch')

const MongoClient = require('mongodb').MongoClient
const { CONNECTION_URI } = process.env

const events = require('./events.json')

const app = express()

auth(passport)

//Setting up body-parser
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
	extended: true
}))

app.use(passport.initialize())
app.use(cookieSession({
	name: 'session',
	keys: ['123']
}))

app.use(cookieParser())

app.get('/', async (req, res) => {
	const {getMoreDetails} = req.query

	if (req.session.token) {
		await MongoClient.connect(CONNECTION_URI, { useNewUrlParser: true }, (err, client) => {
			if (err) throw err
			const database = client.db('Tiiime')
			const userCollection = database.collection('users')

			userCollection.findOne({ id: req.cookies.id }, (error, result) => {
				res.cookie('token', req.session.token)
				res.render('dash', {
					getMoreDetails,
					details: result
				})
			})
		})
	}

	else {
		res.cookie('token', '')
		res.render('login', {
			auth: false,
			email_error: req.query.email_error
		})
	}
})

app.get('/login', passport.authenticate('google', {
	scope: ['email', 'profile']
}))

app.get('/login/callback', passport.authenticate('google', {failureRedirect:'/'}), async (req, res) => {
	const {user} = req

	if (user.profile._json.hd !== 'iiitd.ac.in') {
		return res.redirect('/?email_error=true')
	}

	await MongoClient.connect(CONNECTION_URI, { useNewUrlParser: true }, (err, client) => {
		if (err) throw err
		let getMoreDetails = false

		const database = client.db('Tiiime')
		const collection = database.collection('users')

		collection.findOne({ id: user.profile.id }, (error, result) => {
			if (error) {
				return response.status(500).send(error)
			}

			if (!result) {
				// insert document into collection
				getMoreDetails = true

				collection.insert({
					id: user.profile.id,
					name: user.profile.displayName,
					email: user.profile.emails[0].value,
					done: []
				}, (error, result) => {
					if (error) {
						return response.status(500).send(error)
					}
				})
			}

			req.session.token = user.token
			res.cookie('id', user.profile.id)
			res.redirect(`/${getMoreDetails ? '?getMoreDetails=true' : ''}`)
		})
	})
})

app.get('/logout', (req, res) => {
	req.logout()
	req.session = null
	res.redirect('/')
})

app.post('/more-details', async (req, res) => {
	const {section, group} = req.body
	const details = {
		section,
		group,
		events: events[section][group]
	}

	await MongoClient.connect(CONNECTION_URI, { useNewUrlParser: true }, (err, client) => {
		if (err) throw err

		const database = client.db('Tiiime')
		const collection = database.collection('users')

		collection.update({ id: req.cookies.id }, { $set: { ...details } }, () => {
			res.redirect('/')
		})
	})
})

app.get('/get-proposals', async (req, res) => {
	await MongoClient.connect(CONNECTION_URI, { useNewUrlParser: true }, (err, client) => {
		if (err) throw err

		const database = client.db('Tiiime')
		const userCollection = database.collection('users')
		const proposalCollection = database.collection('proposals')

		userCollection.findOne({ id: req.cookies.id }, (er, result) => {
			const {done, section, group, id} = result

			proposalCollection.find({}).toArray((err, proposals) => {
				res.json(
					proposals.filter(proposal => {
						return (
							!done.includes((proposal.timeid).toString()) &&
							result.id !== proposal.proposerId &&
							proposal.section === section && (
								proposal.scope === 'section' || (
									proposal.scope === 'group' &&
									proposal.group === group
								)
							)
						)
					})
				)
			})
		})

	})
})

app.post('/dismiss', async (req, res) => {
	await MongoClient.connect(CONNECTION_URI, { useNewUrlParser: true }, (err, client) => {
		const database = client.db('Tiiime')
		const collection = database.collection('users')

		collection.findOne({ id: req.cookies.id }, (error, result) => {
			const {done} = result
			const {body} = req

			done.push(body.timeid)

			collection.updateOne({ id: req.cookies.id }, { $set: {done: done} }, () => {
				res.redirect('/')
			})
		})
	})
})

app.post('/action-:type', async (req, res) => {
	await MongoClient.connect(CONNECTION_URI, { useNewUrlParser: true }, (err, client) => {
		const database = client.db('Tiiime')
		const collection = database.collection('users')

		collection.findOne({ id: req.cookies.id }, (error, result) => {
			const {events, done} = result
			const {body} = req

			if (body.edit || body['edit-propose']) {
				requiredIndex = events[body.day_of_week].findIndex(ev => ev.name === body.name)
				events[body.day_of_week][requiredIndex] = {
					name: body.name,
					start_time: body.start_time,
					end_time: body.end_time
				}
			} else if (body.delete) {
				requiredIndex = events[body.day_of_week].findIndex(ev => ev.name === body.name)
				events[body.day_of_week].splice(requiredIndex, 1)
			} else {
				events[body.day_of_week].push({
					name: body.name,
					start_time: body.start_time,
					end_time: body.end_time
				})
			}

			if (body.timeid) {
				done.push(body.timeid)
			}

			collection.updateOne({ id: req.cookies.id }, { $set: {events: events, done: done} }, () => {
				if (req.body['add-propose'] || req.body['edit-propose']) {
					const proposalsCollection = database.collection('proposals')
					proposalsCollection.insert({
						name: body.name,
						day_of_week: body.day_of_week,
						start_time: body.start_time,
						end_time: body.end_time,
						scope: body.scope,
						timeid: new Date().getTime(),
						section: result.section,
						group: result.group,
						proposer: result.name,
						proposerId: result.id,
						type: req.params.type
					}, () => { res.redirect('/') })
				} else {
					res.redirect('/')
				}
			})
		})
	})

})

// Setting public directory
app.use(express.static(path.join(__dirname, '/public')))

// Setting view engine
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '/views'))

app.listen(3000, () => {
	console.log('Server is running on port 3000')
})
