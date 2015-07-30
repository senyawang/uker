
function refreshInit (url) {
	$('.ui-refresh').refresh({
        load: function (dir, type) {
            var me = this;
            $.getJSON(url, function (data) {
                var $list = $('.data-list'),
                    html = (function (data) {      //数据渲染
                        var liArr = [];
                        $.each(data, function () {
                            liArr.push(this.html);
                        });
                        return liArr.join('');
                    })(data);

                $list[dir == 'up' ? 'prepend' : 'append'](html);
                me.afterDataLoading();    //数据加载完成后改变状态
            });
        }
    });
}

var setMask = {
    tpl: '<div class="ui-masks" style="position:absolute;-webkit-transition: all 0.5s; transition: all 0.5s;"></div>',
    init:function (maskContainer,closeCallback) {
        var self = this;
        var maskContainer = maskContainer || 'body';
        $(document).on('touchend', '.ui-masks', function (e) {
            self.close(closeCallback);
        })
    },
    open: function (maskContainer,fn) {
        var self = this;
        var wrap = maskContainer || 'body';
        
        var flag = $(wrap).find('.ui-masks').length;

        if(!flag) $(wrap).append(self.tpl);

        var $mask = self.mask = $(wrap).find('.ui-masks');

        $(wrap).css('overflow','hidden');

        $mask.show();
        $mask.css({'opacity':0.5});

        if(typeof(fn) === 'function') fn();
        
    },
    close: function (fn) {
        var self = this;
        // var maskContainer = maskContainer || 'body';
        // var $mask = $(maskContainer).find('.ui-masks');
        self.mask.css({'opacity':0});
        setTimeout(function () {
            self.mask.hide();
            
        },500)
        if(typeof(fn) === 'function') fn();
    }
}
$(function () {

    refreshInit("url");

	$('#panel').panel({
        contentWrap: $('.mainpage')
    });
	$('#push-right').on('touchend', function () {

        $('#panel').panel('toggle', 'overlay', 'right');
        
        setMask.open();
    });
    $('#panel').on('beforeclose', function (e) {
        setMask.close();
            
    })

    $("#slider").show();
    $("#slider").slider({
        loop: true,
        autoPlay: true,
        dots: false,
        arrow: false,
        imgZoom: true
    });

    $('#nav').navigator();

    $(".slide-panel").on('touchend', '.current', function (e) {

    	e.preventDefault();

    	var $this = $(this);

    	$this.css('marginLeft', '-50%');
    });

    $('#searchForm').on('input', '[type="search"]', function (e) {
    	
    	var $parent = $(this).parents('#searchForm');

    	$parent.find('.s-btn').show();

    	$parent.find('.sf-wrap').css({'text-align': 'left'});

    })

    










    
    

})