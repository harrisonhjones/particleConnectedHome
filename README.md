# Particle Connected Home #

***Alexa Connected Home - Particle Specification***

**Author**: Harrison Jones (harrison@hhj.me)

**Date**: 11/11/2015

**Revision**: 1.0.0


## Description ##

Allows for the control of multipled virtual devices per physical Particle device. To be implemented on a Particle device using cloud functions and variables

## Cloud Functions ##

- control(string controlString) ####

    **usage**: allows for multiple devices to be controled.

    **format**: `device num.state` (lower case ASCII characters)

    **example**: `1.on`,`2.off`,`3..5`,`4.yellow`,etc

    **return value**:
 
     - success =  1

     - failure = -1 (if bad format), -2 if bad device num, -3 if bad device state
 

## Cloud Variables ##

- achStr - string

    a valid JSON array with device information. All values are technically optional but it will not working with a device number (n) and a friendlyName (fn)
    
### Example achStr Value ###

```
{
    "v": "0.3",
    "mfn": "HarrisonJones",
    "mdn": "Prototype",
    "devices": [
        {
            "n": 1,
            "fn": "Living Room Light",
            "fd": "Floor lamp in the living room"
        },
        {
            "n": 2,
            "fn": "Status Light",
            "fd": "Status light"
        }
    ]
}
```