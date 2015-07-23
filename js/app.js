$(function () {

	$('#panel').panel({
        contentWrap: $('.mainpage')
    });
	$('#push-right').on('touchend', function () {
        $('#panel').panel('toggle', 'push', 'right');
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
    
    

})