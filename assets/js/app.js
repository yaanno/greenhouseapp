//(function ($) {
    
    var Product = new Model('product', {
        persistence: Model.localStorage(),
        find_by_tag: function (tag) {
            var products = [];
            this.select(function () {
                var categories = this.attr('categories'),
                    len = categories.length;
                for (var i=0; i < len; i++) {
                    if (categories[i].toString() === tag.toString()) {
                        products.push(this);
                    }
                };
            });
            return products;
        }
    });
    
    var Order = new Model('order', {
        persistence: Model.localStorage()
    });
    
    // main app
    var app = $.sammy(function () {
        
        // content area
        this.element_selector = '#content';
        
        // views {
        
        // view for home
        this.get('#/', function (context) {
            context.app.swap('');
        });
        
        // view for product listing
        this.get('#/products', function (context) {
            var products = Product.all();
            render(products, 'products/all')
        });
        
        this.before('#/products', function (context) {
            
            Product.load(function(products) {
                if (!products.length) {
                    $.ajax({
                        url: 'data/products.json',
                        dataType: 'json',
                        success: function (data) {
                            var product_item;
                            // TODO: replace this with something smarter
                            if (data.length > 0) {
                                $.each(data, function (index, item) {
                                    product_item = new Product(item);
                                    product_item.save();
                                });
                            }
                        },
                        error: function (x, y, z) {
                            app.log('error: ', x, y, z)
                        }
                    })
                } else {
                    // do before stuff with products
                }
            })
        })
        
        this.get('#/product/:name/:id', function (context) {
            var product = Product.find(this.params['id']);
            render(product, 'products/show');
        });
        
        // utility functions
        
        function render (data, template) {
            var html = new EJS({
                url: 'templates/' + template + '.ejs'
            }).render(data);
            app.swap(html);
        }
        
        $("#feedback").ajaxStart(function () {
            $(this).show();
        });
        
        $("#feedback").ajaxComplete(function () {
            $(this).hide();
        });
        
        // view for product listing filtered by tag name
        this.get('#/products/by_tag/:tag', function (context) {
            var products = Product.find_by_tag(this.params['tag']);
            render(products, 'products/all');
        });
        
        // TODO: cart should be a separate app
        
        this.post('#/cart', function (context) {
            var product = Product.find(this.params['id']),
                amount = +this.params['amount'];
            
            if (product) {
                //app.log(product, amount)
                var cartItem = { product: product.uid, user: 1, amount: amount }
                    order = new Order(cartItem);
                order.save();
            }
            
        });
        
        // view for cart
        this.get('#/cart', function (context) {
            
        });
        
        // } views
        
    });
    
    // main call
    $(function () {
        app.run('#/');
    });
    
//})(jQuery);