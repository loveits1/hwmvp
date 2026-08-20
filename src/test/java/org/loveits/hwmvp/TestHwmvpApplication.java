package org.loveits.hwmvp;

import org.springframework.boot.SpringApplication;

public class TestHwmvpApplication {

	public static void main(String[] args) {
		SpringApplication.from(HwmvpApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
