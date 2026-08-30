package org.loveits.hwmvp.homework.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

	/** 숙제관리 메인 화면의 Thymeleaf 템플릿을 반환합니다. */
	@GetMapping("/")
	public String home() {
		return "index";
	}
}
