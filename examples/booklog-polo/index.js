/**
 * Module dependencies.
 */

var express = require('../../lib/express');

// Path to our public directory

var pub = __dirname + '/public';//根目錄為public
// setup middleware
var app = express();//用express 框架來開發
app.use(express.static(pub));
app.set('views', __dirname + '/views');//在public內找到views裡面的index.js 為初始畫面
app.locals.moment = require('moment');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/booklog2');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  console.log('MongoDB: connected.');	
});

var postSchema = new mongoose.Schema({
    subject: { type: String, default: ''},
    content: String,
 	timeCreated: { type: Date, default: Date.now },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orders: []

});

postSchema.index({ content: 'text' });
var userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    displayName: { type: String, unique: true },
    email: { type: String, unique: true },
    timeCreated: { type: Date, default: Date.now },
    facebook: {}
});
app.db = {//宣告 model
	posts: mongoose.model('Post', postSchema),//宣告postSchema為‘Post’如果Schema為Post 的話 collections 就要為	posts
	users: mongoose.model('User', userSchema)
};
// Optional since express defaults to CWD/views
// Set our default template engine to "jade"
// which prevents the need for extensions
// (although you can still mix and match)
app.set('view engine', 'jade');

var bodyParser = require('body-parser');
var session = require('express-session');
var events = require('events');
var paypal_api = require('paypal-rest-sdk');//加入程式庫
var config_opts = {//設定
    'host': 'api.sandbox.paypal.com',
    'port': '',
    'client_id': 'AUNxvhDJcitRVMWyS2UvpHLiLsVgzmXFi08ewr0iRqKqSIY-V1_dzaoz3V7C',
    'client_secret': 'EFdqfhDxlTHSHUKQ4yeDaaT8DjZegMSLDw3tiyoqrMW1cazRSO2LwSnYTOYW'
};

var passport = require('passport')
  , FacebookStrategy = require('passport-facebook').Strategy;


app.use(bodyParser.urlencoded({
  extended: true
}));
var jsonParser = bodyParser.json()

app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

//facebook登入系統


passport.use(new FacebookStrategy({
    clientID:'257942504414864',
    clientSecret:'8515ca40ec40b58d30e974c8cf2c9f3b',
    callbackURL: "http://polo-booklog.cloudapp.net:3000/auth/facebook/callback"
  },
 function(accessToken, refreshToken, profile, done) {
	   app.db.users.findOne({"facebook._json.id": profile._json.id}, function(err, user) {
		   	if (!user) {
			  var obj = {
			    username: profile.username,
			    displayName: profile.displayName,
			    email: '',
			    facebook: profile
			   };

			   var doc = new app.db.users(obj);
		   	   doc.save();

		   	   user = doc;
		   	}

		   	return done(null, user); // verify
	   });
  }
));


// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
app.get('/auth/facebook', passport.authenticate('facebook'));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/facebook/callback', 
  passport.authenticate('facebook', { successRedirect: '/',
                                      failureRedirect: '/login' }));

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: 'read_stream' })
);

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope: ['read_stream', 'publish_actions'] })
);

app.all('*', function(req, res, next){
  if (!req.get('Origin')) return next();
  // use "*" here to accept any origin
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'PUT');
  res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
  // res.set('Access-Control-Allow-Max-Age', 3600);
  if ('OPTIONS' == req.method) return res.send(200);
  next();
});
//登入
app.get('/', function(req, res, next) {
	if (req.isAuthenticated()) {
		next();
	} else {
		res.render('login');
	}
});
//登出
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/welcome', function(req, res) {
	res.render('index');
});

app.get('/', function(req, res) {
	res.render('index');
});
//下載
app.get('/download', function(req, res) {

	var workflow = new events.EventEmitter();

	workflow.outcome = {
		success: false,
	};

	workflow.on('vaidate', function() {
		var password = req.query.password;

		if (typeof(req.retries) === 'undefined')
			req.retries = 3;

		if (password === '123456') {
			return workflow.emit('success');
		}

		return workflow.emit('error');
	});

	workflow.on('success', function() {
		workflow.outcome.success = true;
		workflow.outcome.redirect = { 
			url: '/welcome'
		};
		workflow.emit('response');
	});

	workflow.on('error', function() {
		if (req.retries > 0) {
			req.retries--;
			workflow.outcome.retries = req.retries;
			workflow.emit('response');
		}

		workflow.outcome.success = false;
		workflow.emit('response');
	});

	workflow.on('response', function() {
		return res.send(workflow.outcome);
	});

	return workflow.emit('vaidate');
});
//列出所有文章
app.get('/post', function(req, res) {
	res.render('post');
});
//列出某一筆文章
app.get('/1/post/:id', function(req, res) {	
	var id = req.params.id;
	var posts = req.app.db.model;

	posts.findOne({_id: id}, function(err, post) {
		res.send({post: post});	
	});
});

app.get('/1/post/tag/:tag', function(req, res){
	var tag = req.params.tag;
	var posts = req.app.db.posts;
	posts
    .find( { $text: { $search: tag } } )
    .exec(function(err, posts) {
    	if (err) return console.log(err);
        res.send({posts: posts});
    });
});
/* 
	排序文章
 */
app.get('/1/post', function(req, res) {	
	var posts = req.app.db.posts;

	posts
	.find()
	.populate('userId')//展開這個作者
	.sort({'timeCreated':-1})//以時間排序
	.find(function(err, posts) {
		res.send({posts: posts});	
	});
});

/* 
	購買文章
 */
app.put('/1/post/:postId/pay', function(req, res, next) {
	console.log('call API');
var workflow = new events.EventEmitter();
    var postId = req.params.postId;
    var posts = req.app.db.posts;
    
    workflow.outcome = {
    	success: false
    };

    workflow.on('validate', function() {
        workflow.emit('createPayment');
    });

    workflow.on('createPayment', function() {

		paypal_api.configure(config_opts);

		var create_payment_json = {
		            intent: 'sale',
		            payer: {
		                payment_method: 'paypal'
		            },
		            redirect_urls: {
		                return_url: 'https://localhost:3000/1/post/' + postId + '/paid',
		                cancel_url: 'https://localhost:3000/1/post/' + postId + '/cancel'
		            },
		            transactions: [{
		                amount: {
		                    currency: 'TWD',
		                    total: 99
		                },
		                description: '購買八卦文章'
		            }]
		};

		paypal_api.payment.create(create_payment_json, function (err, payment) {
		    if (err) {
		        console.log(err);
		    }

		    if (payment) {
		        console.log("Create Payment Response");
		        console.log(payment);
		    }

		    var order = {
		    	userId: req.user._id,
		    	paypal: payment
		    };

			posts
			.findByIdAndUpdate(postId, { $addToSet: { orders: order } }, function(err, post) {
				workflow.outcome.success = true;
				workflow.outcome.data = post;
				return res.send(workflow.outcome);
			});
		});
    });

    return workflow.emit('validate');
});
/* 
	寫入文章
 */
app.post('/1/post', jsonParser, function(req, res) {
	var posts = req.app.db.posts;
	var subject;
	var content;
	var userId = req.user._id;
	var workflow = new events.EventEmitter();

 	workflow.outcome = {
		success: false,
		errfor: {}
 	};


	workflow.on('validation', function() {
		subject = req.body.subject;
		content = req.body.content;	
		console.log('subject '+subject);
		if (subject === '') {
			workflow.outcome.errfor.subject = '必填欄位';
		}
		console.log('content '+content);
	 	if (content === '') {
			workflow.outcome.errfor.content = '必填欄位';
		}

		if (Object.keys(workflow.outcome.errfor).length !== 0)
 			return res.send(workflow.outcome);

			workflow.emit('savePost');
		
	});

	workflow.on('savePost', function() {
		var data = {
			userId: userId,
			subject: subject,
			content: content
		};

		var post = new posts(data);//新開一個文件的意思
		post.save();//存檔，資料內 mongodb 會自動加上一個 _id 為檔名的意思

		workflow.outcome.success = true;
		workflow.outcome.data = post;

		res.send(workflow.outcome);
	});
	return workflow.emit('validation');
});
/* 
	刪除文章
 */
app.delete('/1/post', function(req, res) {
	res.send("Delete a post");
});
/* 
	更新文章
 */
app.put('/1/post/:postId', function(req, res) {
	var id = req.params.postId;

	res.send("Update a post: " + id);
});


app.use(function(err, req, res, next) {
  res.send(err.stack);
});

/* istanbul ignore next */
if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}