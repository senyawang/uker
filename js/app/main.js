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
    

})