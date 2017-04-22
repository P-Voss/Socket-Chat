
jQuery(document).ready(function(){
    
    jQuery("#toggleUser").on('click', function() {
        if (jQuery("#userList").css("display") === "none") {
            jQuery("#messages").animate({width: "86%"}, 200, "linear",
            function() {
                jQuery("#toggleUser").html("Hide");
                jQuery("#userList").slideToggle(200, "linear");
            });
        } else {
            jQuery("#userList").slideToggle(200, "linear", 
            function (){
                jQuery("#messages").animate({width: "100%"}, 200, "linear");
                jQuery("#toggleUser").html("Show");
            });
        }
    });

    jQuery("#send").on('click', function(event){
        jQuery('#message').autocomplete("option", "disabled", false);
        event.preventDefault();
        sendMessage();
        jQuery('#message').autocomplete("option", "disabled", true);
    });
    
    jQuery("#roomlist").on('change', function(){
        switchRoom(jQuery("#roomlist option:selected").val());
    });
    
    jQuery("#chat_form").on('submit', function(event){
        event.preventDefault();
        sendMessage();
    });
});
