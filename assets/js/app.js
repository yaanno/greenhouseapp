/*jslint browser: true */
/*globals Model, EJS, jQuery */

(function ($) {
    
    // constants
    
    var productapi = 'data/products.json';
    
    // utility functions
    
    $("#feedback").ajaxSend(function (event, request, options) {
        //console.log(options, event, request)
        $(this).show();
    });
    
    $("#feedback").ajaxComplete(function (event, request, options) {
        //console.log(options, event, request)
        if (options.url == productapi) {
            app.trigger('products-downloaded', request)
        }
        $(this).hide();
    });
    
    var render = function (opts) {
        var html = new EJS({
            url: 'templates/' + opts.template + '.ejs'
        }).render(opts.data);
        opts.app.swap(html);
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
        
        this.bind('products-downloaded', function (event, data) {
            this.log(event, data);
            // trigger save data
        });
        
        this.bind('products-saved', function (event, data) {
            // trigger render
        });
        
        // views {
        
        // dummy model loader
        this.before({}, function (context) {
            this.log('process before every path');
            User.load();
            Order.load();
            Cart.load();
            Product.load();
        })
        
        // view for home
        this.get('#/', function (context) {
            context.app.swap('');
        });
        
        // view for product listing
        this.get('#/products', function (context) {
            var products = Product.all(),
            out = {
                app: this,
                data: products,
                template: 'products/all'
            };
            render(out);
        });
        
        this.before('#/products', function (context) {
            Product.load(function (products) {
                if (!products.length) {
                    $.ajax({
                        url: 'data/products.json',
                        dataType: 'json',
                        success: function (data) {
                            var product_item;
                            /*if (data.length > 0) {
                                $.each(data, function (index, item) {
                                    product_item = new Product(item);
                                    product_item.save();
                                });
                            }*/
                        },
                        error: function (x, y, z) {
                            app.log('error: ', x, y, z);
                        }
                    });
                } else {
                    // do before stuff with products
                }
            });
        });
        
        // view for product item
        this.get('#/product/:name/:id', function (context) {
            var product = Product.find(this.params.id),
                out = {
                    app: this,
                    data: product,
                    template: 'products/show'
                };
            render(out);
        });
        
        // view for product listing filtered by tag name
        this.get('#/products/by_tag/:tag', function (context) {
            var tag = this.params.tag.replace('-', ' '),
                products = Product.find_by_tag(tag),
                out = {
                    app: this,
                    data: products,
                    template: 'products/all'
                };
            render(out);
        });
        
        this.post('#/cart', function (context) {
            var product = Product.find(this.params.id),
                amount = +this.params.amount,
                cart_item = Cart.detect(function () {
                    return this.attr('product_id') == product.id();
                });
            
            if (product) {
                
                if (cart_item) {
                    var old_amount = cart_item.attr('amount');
                    cart_item.attr('amount', old_amount + amount);
                    cart_item.save();
                    console.log('item updated')
                } else {
                    cart_item = new Cart({
                        product_id: product.id(), // TODO: replace with assoc
                        user_id: 1, // TODO: replace with real user
                        amount: amount
                    });
                    cart_item.save(function (success) {
                        if (success) {
                            console.log('item saved')
                        }
                    });
                }
            }
        });
        
        this.get('#/cart', function (context) {
            // display cart content
            var cart = Cart.all(),
                data = [];
            $.each(cart, function(index, item) {
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
        render(out);
        });
        
        // } views
        
    })
    
    // TODO: define the following apps here:
    // breadcrumb: display the current path
    // user: display and manage user states
    
    // main call
    $(function () {
        app.run('#/');
    });
    
})(jQuery);