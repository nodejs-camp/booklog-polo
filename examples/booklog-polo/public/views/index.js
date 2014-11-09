/**
 * SETUP
 **/
  var app = app || {};

/**
 * MODELS
 **/

app.Search = Backbone.Model.extend({ 
  url: function(){
    return 'http://localhost:3000/1/post/tag/' + this.attributes.tag

  },
  tag:'',
  defaults: {
    success: false,
    errors: [],
    errfor: {},
    
  posts: [{
         "_id": "",
         "subject": ""
     }]
  }
});//搜尋用的
app.Post = Backbone.Model.extend({  
  url: 'http://localhost:3000/1/post',
  defaults: {
    success: false,
    errors: [],
    errfor: {},
    
  posts: [{
         "content": "hello",
         "_id": "5402de2f559097cdf139fff9",
         "subject": "abc123"
     }]
  }
});//文章列表用的
app.SinglePost = Backbone.Model.extend({  
  url: 'http://localhost:3000/1/post',
  defaults: {
    success: false,
    errors: [],
    errfor: {},

    content: '',
    subject: ''
  }
});//貼文章用的
app.PurchasePost = Backbone.Model.extend({  
  url: function() {
    alert('call');
    return 'http://localhost:3000/1/post/' + this.attributes.id + '/pay'
  },
  defaults: {
    success: false,
    errors: [],
    errfor: {},
  }
});//購買按扭用的

/**
 * VIEWS
 **/
  app.FormView = Backbone.View.extend({
    el: '#form-section',
    events: {
      'submit form': 'preventSubmit',
      'click #btn-submit': 'performSubmit'
    },
    initialize: function() {
        this.model = new app.SinglePost();

        this.template = _.template($('#tmpl-form').html());
        this.model.bind('change', this.render, this); 
        this.render();       
    },
    render: function() {
        var data = this.template(this.model.attributes);
        this.$el.html(data);
        return this;
    },
    preventSubmit: function(event) {
        event.preventDefault();
    },
    performSubmit: function() {
      var subject = this.$el.find('#subject').val();
      var content = this.$el.find('#content').val();

      this.model.save({
        subject: subject,
        content: content
      });
    }
  });
  app.Searchview = Backbone.View.extend({
      el: '#search-section',
      events: {
      'click .btn-search':'preformSerach'
      },
      initialize: function() {
        this.model = new app.Search();
        this.template = _.template($('#tmpl-results').html());
        this.model.bind('change', this.render, this);
      },
      render: function() {
        var data = this.template(this.model.attributes);
         $('#search-result').html(data);
        return this;
      },
      preformSerach: function(){
         var tag= this.$el.find('#search-tag').val();
         this.model.set('tag', tag);
         this.model.fetch();
      }
  });
  app.PostView = Backbone.View.extend({
  	el: '#blog-post',
    events: {
        'click .btn-filter': 'performFilter',
        'click .btn-format': 'performFormat',
        'click [data-purchase-for]': 'performPurchase'
    },
    initialize: function() {
        this.model = new app.Post();
        this.template = _.template($('#tmpl-post').html());
        this.purchase = new app.PurchasePost();
        this.model.bind('change', this.render, this);
        
        this.model.fetch();
    },
    render: function() {
        var data = this.template(this.model.attributes);
        
        this.$el.html(data);
        this.performFormat();

        return this;
    },
    performFormat: function() {
        this.$el.find('.post-date').each(function () {
          var me = $(this);
          me.html( moment( me.text() ).fromNow() );
        });
    },
     performPurchase: function(event) {
        var me = this.$el.find(event.target);
        var postId = me.data('purchase-for');
        var self = this;

        event.preventDefault();

        this.purchase.set('id', postId);
        this.purchase.save(this.purchase.attributes, {
          success: function(model, response, options) {
              alert('訂購成功。等候付款！');
              self.model.fetch();
          },
          error: function(model, response, options) {
            alert('失敗')
          }
        });
    }
  });

/**
 * BOOTUP
 **/
  $(document).ready(function() {
    app.postView = new app.PostView();
    app.searchview= new app.Searchview();
    app,formView=new app.FormView();
  });