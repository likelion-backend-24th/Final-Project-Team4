package com.team4.expo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.team4.expo", "com.team4.common"})
public class ExpoApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExpoApplication.class, args);
    }
}
