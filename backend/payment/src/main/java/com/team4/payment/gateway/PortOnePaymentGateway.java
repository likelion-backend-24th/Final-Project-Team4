package com.team4.payment.gateway;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class PortOnePaymentGateway {

    private final String apiSecret;
    
}
