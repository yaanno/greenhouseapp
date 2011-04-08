/*jslint browser: true */
/*globals Model, EJS, jQuery, app */

(function ($) {
    
    // constants
    
    var productapi = 'data/products.json',
        $feedbackDiv = $('#feedback'),
        $body = $(document.body),
        $syncBtn = $('#sync');
    
    // utility functions
    
    $("#feedback").ajaxSend(function (event, request, options) {
        app.trigger('feedback', { message: 'Loading data, please wait ...' });
    });
    
    $("#feedback").ajaxComplete(function (event, request, options) {
        if (options.url === productapi) {
            app.trigger('products-downloaded', request.responseText);
        }
    });
    
    var render = function (params) {
        var html = new EJS({
            url: 'templates/' + params.template + '.ejs'
        }).render(params.data);
        params.app.swap(html);
    },
    
    // models
    
    User = new Model('user', {
        persistence: Model.localStorage()
    }),
    
    Product = new Model('product', {
        persistence: Model.localStorage(),
        find_by_tag: function (tag) {
            var products = [];
            this.select(function () {
                var categories = this.attr('categories'),
                    len = categories.length,
                    i = 0;
                for (i; i < len; i += 1) {
                    if (categories[i].toString() === tag.toString()) {
                        products.push(this);
                    }
                }
            });
            return products;
        }
    }),
    
    Cart = new Model('cart', {
        persistence: Model.localStorage()
    }),
    
    Order = new Model('order', {
        persistence: Model.localStorage()
    }),
    
    // main app
    app = $.sammy(function () {
        
        this.debug = false;
        
        // content area
        this.element_selector = '#content';
        
        this.bind('feedback', function (event, data) {
            this.log('bind.feedback', data);
            $feedbackDiv
                .text(data.message)
                .show()
                .animate({
                    opacity: 'toggle'
                }, 1200);
        });
        
        // get products from server
        this.bind('sync', function (event, data) {
            this.log('bind.sync');
            $.ajax({
                url: productapi,
                dataType: 'json',
                success: function (data) {
                    app.trigger('save', data);
                }
            });
        });
        
        // save products to local storage
        this.bind('save', function (event, data) {
            this.log('bind.save', data);
            // trigger saved
            var product_item = null;
            if (data.length > 0) {
                $.each(data, function (index, item) {
                    product_item = new Product(item);
                    product_item.save();
                });
            }
            this.trigger('saved', data);
        });
        
        // do something with saved products
        this.bind('saved', function (event, data) {
            this.log('bind.saved', data);
            this.redirect('#/products');
        });
        
        // render anything
        this.bind('render', function (event, data) {
            this.log('bind.render', data);
            render(data);
        });
        
        $syncBtn.bind('click', function (event) {
            event.preventDefault();
            app.trigger('sync');
        });
        
        // views {
        
        // dummy model loader
        this.before({}, function (context) {
            this.log('load models');
            User.load();
            Order.load();
            Cart.load();
            Product.load();
        });
        
        // show home
        this.get('#/', function (context) {
            $body[0].className = 'home';
            context.app.swap('');
        });
        
        // list products
        this.get('#/products', function (context) {
            $body[0].className = 'products';
            var products = Product.all();
            if (products.length) {
                var out = {
                    app: this,
                    data: products,
                    template: 'products/all'
                };
                this.trigger('render', out);
            } else {
                this.trigger('sync');
            }
        });
        
        // show product item
        this.get('#/product/:name/:id', function (context) {
            $body[0].className = 'product';
            var product = Product.find(this.params.id),
                out = {
                    app: this,
                    data: product,
                    template: 'products/show'
                };
            this.trigger('render', out);
        });
        
        // product listing filtered by tag name
        this.get('#/products/by_tag/:tag', function (context) {
            $body[0].className = 'products';
            var tag = this.params.tag.replace('-', ' '),
                products = Product.find_by_tag(tag),
                out = {
                    app: this,
                    data: products,
                    template: 'products/all'
                };
            if (products.length) {
                this.trigger('render', out);
            } else {
                // render not found
            }
        });
        
        // add item to cart
        this.post('#/cart', function (context) {
            var product = Product.find(this.params.id),
                amount = +this.params.amount,
                cart_item = Cart.detect(function () {
                    return this.attr('product_id') === product.id();
                });
            
            if (product) {
                if (cart_item) {
                    var old_amount = cart_item.attr('amount');
                    cart_item.attr('amount', old_amount + amount);
                    cart_item.save();
                    app.log('cart updated');
                } else {
                    cart_item = new Cart({
                        product_id: product.id(), // TODO: replace with assoc
                        user_id: 1, // TODO: replace with real user
                        amount: amount
                    });
                    cart_item.save(function (success) {
                        if (success) {
                            app.log('item saved');
                        }
                    });
                }
                this.trigger('feedback', { message: 'product added' });
            }
        });
        
        // modify cart
        this.put('#/cart', function (context) {
            var cart = Cart.find(this.params[':id']);
            cart.destroy();
        });
        
        // show cart
        this.get('#/cart', function (context) {
            $body[0].className = 'cart';
            // display cart content
            var cart = Cart.all(),
                data = [],
                out = {};
            $.each(cart, function (index, item) {
                data.push([
                    item,
                    Product.find(+item.attr('product_id'))
                ]);
            });
            out = {
                app: this,
                data: data,
                template: 'cart/show'
            };
            this.trigger('render', out);
        });
        
        // } views
    });
    
    // main call
    $(function () {
        app.run('#/');
    });
    
})(jQuery);