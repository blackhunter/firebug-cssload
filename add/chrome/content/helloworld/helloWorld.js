/* 
 * Author: Jan Odvarko, www.janodvarko.cz
 */

FBL.ns(function() { with (FBL){

var panelName = "HelloWorld";
//noinspection JSValidateTypes

Firebug.FireKit = extend(Firebug.Module,
{
    onSave: function(context){
      alert("Hello World!");
    }
}); 

Firebug.registerModule(Firebug.FireKit);

}});
