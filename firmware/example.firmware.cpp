char *achString = "{\"v\":\"0.1\",\"mfn\":\"HarrisonJones\",\"mdn\":\"Prototype\",\"devices\":[{\"n\":1,\"fn\":\"Living Room Light\",\"fd\":\"Floor lamp in the living room\"}]}";
int deviceNum = 0;
int deviceState = 0;

int control(String commandStr);

void setup()
{
    Particle.variable("achStr", achString, STRING);
    Particle.variable("deviceNum", &deviceNum, INT);
    Particle.variable("deviceState", &deviceState, INT);
    
    Particle.function("control", control);
    
    pinMode(D7, OUTPUT);
    
    digitalWrite(D7, HIGH);

    deviceState = 1;
}


void loop()
{
    
}

// Alexa Connected Home - Particle Specification V1.0.0 Compliant
int control(String commandStr)
{
    int periodIndex = commandStr.indexOf('.');
    int strLen = commandStr.length();
    
    if(periodIndex > 0)
    {
        deviceNum = commandStr.substring(0, periodIndex).toInt();
        deviceState = commandStr.substring(periodIndex + 1,strLen).toInt();
    
        if(deviceNum == 0)
        {
            if((deviceState == 0) || (deviceState == 1))
            {
                digitalWrite(D7, deviceState);
                return 1;
            }
            else
            {
                return -3;
            }
        }
        else
        {
            return -2;
        }
    }
    else
    {
        return -1;
    }
}

    