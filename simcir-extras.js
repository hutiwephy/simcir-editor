// includes following device types:
//  Rotary Encoder (Improved upon SimCir version)
//  Memory 16-bit
//  Serial Interface

const term = function(onbyte, options){};
const hexeditor = function(onchange, options){};

(function (){

    function createRotaryEncoderFactory(){
        var $s = simcir;
        
        var $ = $s.$;
        var unit = $s.unit;

        var _MIN_ANGLE = 45;
        var _MAX_ANGLE = 315;
        var thetaToAngle = function (theta){
            var angle = (theta - Math.PI / 2) / Math.PI * 180;
            while (angle < 0){
                angle += 360;
            }
            while (angle > 360){
                angle -= 360;
            }
            return angle;
        };
        return function (device){
            var numOutputs = Math.max(2, device.deviceDef.numOutputs || 4);
            device.halfPitch = numOutputs > 4;
            device.addInput();
            for (var i = 0; i < numOutputs; i += 1){
                device.addOutput();
            }

            var super_getSize = device.getSize;
            device.getSize = function (){
                var size = super_getSize();
                return { width: unit * 4, height: size.height };
            };

            var super_createUI = device.createUI;
            device.createUI = function (){
                super_createUI();
                var size = device.getSize();

                var $knob = $s.createSVGElement('g').
                    attr('class', 'simcir-basicset-knob').
                    append($s.createSVGElement('rect').
                        attr({ x: -10, y: -10, width: 20, height: 20 }));
                var r = Math.min(size.width, size.height) / 4 * 1.5;
                var g = $s.graphics($knob);
                g.drawCircle(0, 0, r);
                g.attr['class'] = 'simcir-basicset-knob-mark';
                g.moveTo(0, 0);
                g.lineTo(r, 0);
                g.closePath();
                device.$ui.append($knob);

                var _angle = _MIN_ANGLE;
                var setAngle = function (angle){
                    _angle = Math.max(_MIN_ANGLE, Math.min(angle, _MAX_ANGLE));
                    update();
                };

                var dragPoint = null;
                var knob_mouseDownHandler = function (event){
                    event.preventDefault();
                    event.stopPropagation();

                    var new_angle = _angle+((_MAX_ANGLE-_MIN_ANGLE)/15);

                    if(new_angle > _MAX_ANGLE){
                        new_angle = _MIN_ANGLE;
                    }

                    setAngle(new_angle);
                };
                device.$ui.on('deviceAdd', function (){
                    $s.enableEvents($knob, true);
                    $knob.on('mousedown', knob_mouseDownHandler);
                });
                device.$ui.on('deviceRemove', function (){
                    $s.enableEvents($knob, false);
                    $knob.off('mousedown', knob_mouseDownHandler);
                });

                var update = function (){
                    $s.transform($knob, size.width / 2,
                        size.height / 2, _angle + 90);
                    var max = 1 << numOutputs;
                    var value = Math.min(((_angle - _MIN_ANGLE) /
                        (_MAX_ANGLE - _MIN_ANGLE) * max), max - 1);
                    for (var i = 0; i < numOutputs; i += 1){
                        device.getOutputs()[i].setValue((value & (1 << i)) ?
                            device.getInputs()[0].getValue() : null);
                    }
                };
                device.$ui.on('inputValueChange', update);
                update();
                device.doc = {
                    params: [
                        {
                            name: 'numOutputs', type: 'number', defaultValue: 4,
                            description: 'number of outputs.'
                        }
                    ],
                    code: '{"type":"' + device.deviceDef.type + '","numOutputs":4}'
                };
            };
        };
    }

    function createMemory16bFactory(){}
    function createSerialInterfaceFactory(){}

    // register Rotary Encoder
    simcir.registerDevice('Rotary Encoder', createRotaryEncoderFactory());
    //simcir.registerDevice('Memory 16-bit', createMemory16bFactory());
    //simcir.registerDevice('Serial Interface', createSerialInterfaceFactory());
})();
