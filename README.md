# Particle Connected Home #

***Alexa Connected Home - Particle Specification***

**Author**: Harrison Jones (harrison@hhj.me)

**Date**: 9/24/2015

**Revision**: 0.1.0


## Spec # 1 ##

### Description ###

Allows for the control of a single Particle-powered device. To be implemented on a Particle device using cloud functions and variables

### Device Name ###
The friendly name of the device

### FUNCTIONS ###

- control(string controlString) ####

    **usage**: allows for control of the device 

    **format**: `state` (lower case ASCII characters)

    **example**: `on`, `off`, `0.5`, `yellow`, `hsv(#,#,#)`, `rgb(#,#,#)`, "`xxxxxx`, ...

    **return value**:
 
     - success =  1

     - failure = -1
 

### VARIABLES ###

- achSpec - int

    MUST BE SET TO 1

- firmwareVer - int - **optional** 

    Set to the internal firmware version number

## Spec # 2 ## - 

### Description ###

Allows for the control of multipled virtual devices per physical Particle device. To be implemented on a Particle device using cloud functions and variables

### Device Name ###
Not needed

### FUNCTIONS ###

- control(string controlString) ####

    **usage**: allows for multiple devices to be controled.

    **format**: `#1:state,#2:state,...` (lower case ASCII characters)

    **example**: `1:on,2:off,3:.5,4:yellow,...`

    **return value**:
 
     - success =  1

     - failure = -1
 

### VARIABLES ###

- devices - string

    a valid JSON array with friendly name and device type.
    
    **example** `[{"device name":"device type"},{"device name #2":"device type 2"}]`

- achSpec - int

    MUST BE SET TO 2

- firmwareVer - int - **optional** 

    Set to the internal firmware version number
