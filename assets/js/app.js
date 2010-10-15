(function ($) {
    
    // main app
    var app = $.sammy(function () {
        
        // load store
        var store = new Sammy.Store({name: 'greenhouse', element: '#content', type: 'local'});
        
        // content area
        this.element_selector = '#content';
        
        // views {
        
        // view for home
        this.get('#/', function (context) {
            context.app.swap('');
        });
        
        // view for product listing
        // 1. get products from database
        //    if database is empty get products from server
        //    and save them to database
        //    goto 1.
        // 2. render products and send them to browser
        this.get('#/products', function (context) {
            this.log('processing route ', context.path)
            var data = store.get('products');
            if (!data.products.length) {
                this.log('no products in store')
                // no products in store, display feedback
            } else {
                // render products
                render(data, 'products/all');
            }
        });
        
        this.before('#/products', function (context) {
            this.log('start before check')
            // should check if 'products' is empty or if needs to be updated
            if (!store.exists('products')) {
                this.log('store doesnt exist, creating')
                store.set('products', { "products":[] });
            }
            
            var data = store.get('products');
            
            // zero element, perhaps first update
            // TODO: move this out to a function
            if (!data.products.length) {
                this.log('no products in store, downloading')
                $.ajax({
                    url: 'data/products.json',
                    dataType: 'json',
                    success: function (data) {
                        app.log('got products, saving to store')
                        store.set('products', data);
                        // TODO: make this evented instead
                        render(data, 'products/all');
                    }
                });
            } else {
                // TODO: timestamp check for last updated
                this.log('found products in store, passing to route')
            }
            this.log('end before check')
        })
        
        this.get('#/product/:name/:id', function (context) {
            var product_id = this.params['id'],
                data = store.get('products'),
                product = null;
            $.each(data.products, function (index, item) {
                if (+item.id === +product_id) {
                    product = item;
                    return;
                }
            });
            
            if (product) {
                app.log(product);
                product = { product: product }
                render(product, 'products/show');
            }
            
        });
        
        // utility functions
        
        function render (data, template) {
            //app.log(data, template)
            app.log('rendering products')
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
        // 1. get products from database by tag
        //   if database is empty get products from server
        //   and save them to database
        //   goto 1.
        // 2. render products and send the to the browser
        this.get('#/products/by_tag/:name', function (context) {
            this.log('processing route ', context.path)
            var tag = this.params['name'],
                data = store.get('products'),
                products = [];
            
            // filter products by tag name
            this.log('filtering products by tag: ' + tag);
            $.each(data.products, function (index, product) {
                //app.log(index, product)
                $.each(product.categories, function (index, category) {
                    var title = category.title.replace(' ', '-');
                    if (tag === title) {
                        app.log('product with tag ' + tag + ' found: ', product)
                        products.push(product);
                    }
                });
            });
            
            data = {"products": products}
            render(data, 'products/all');
            
        });
        
        // TODO: cart should be a separate app
        
        this.post('#/cart', function (context) {
            var data = store.get('products'),
                id = +this.params['id'], // string to number
                amount = +this.params['amount'],
                product = null;
            
            $.each(data.products, function (index, item) {
                // TODO: stop the iterator when id matches
                if (item.id === id) {
                    product = item;
                }
            });
            
            console.log(product, amount)
            
        });
        
        // view for cart
        this.get('#/cart', function (context) {
            this.log(this.params)
            //context.app.swap('');
            //context.$element().append('cart');
        });
        
        // } views
        
    });
    
    // main call
    $(function () {
        app.run('#/');
    });
    
})(jQuery);