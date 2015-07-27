$(function () {

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

    refreshInit("url");

	var uiMask = $('<div class="ui-masks"></div>');

	$('#panel').panel({
        contentWrap: $('.mainpage')
    });
	$('#push-right').on('touchend', function () {
        $('#panel').panel('toggle', 'overlay', 'right');
        // uiMask
        // 	.appendTo("#page")
        // 	.css('opacity',0.5);
    });

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

    $('.J_dropMenu').on('tap', function (e) {

    	e.preventDefault();

    	$(this)
    		.toggleClass('current')
    		.siblings()
    		.removeClass('current');

    	$('.s-mask').show();
    	$('.J_dropCont').show();	
    })

    $(document).on('tap', '.s-mask', function (e) {
    	
    	$(this).hide();
    	$('.J_dropCont').hide();
    	$('.J_dropMenu').removeClass('current');

    })










    
    

})