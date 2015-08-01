
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

    $(document).on('touchend', '.btn-back', function (e) {
        e.preventDefault();
        location.href = document.referrer;
    })

    refreshInit("url");

	var PANEL = new gmu.Panel($('#panel'),{
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


    // 筛选面板

    var $firstBox = $("#mainPanelBox"),
        
        subPanelParent;

    $firstBox.on('touchend', 'li', function (e) {

    	e.preventDefault();

    	$firstBox.css('marginLeft', '-50%');

        subPanelParent = $(this).attr('data-type');
        console.log(subPanelParent)
    });

    $('#panelBack').on('touchend', function (e) {
        
        e.preventDefault();

        var marginLeft = $firstBox.css('marginLeft');

        if(marginLeft == '0px' || marginLeft == null) PANEL.close();

        $firstBox.css('marginLeft', '0')
    });

    $('#subPanelBox').on('touchend', 'li', function (e) {
        e.preventDefault();
        $(this).addClass('hover').siblings().removeClass('hover');
        $('.'+subPanelParent).html($(this).attr('data-value'));
    })


    // 搜索框
    $('#searchForm').on('input', '[type="search"]', function (e) {
    	
    	var $parent = $(this).parents('#searchForm');

    	$parent.find('.s-btn').show();

    	$parent.find('.sf-wrap').css({'text-align': 'left'});

    })

    










    
    

})