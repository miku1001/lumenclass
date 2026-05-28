"""Standalone hardware test for the ESP8266 PIR and LED wiring.

Run this file before main.py to verify that each LED and PIR sensor is
connected to the expected GPIO pin and responds correctly.
"""

import machine
import time


PIR_PINS = [5, 14, 12, 13]   # D1, D5, D6, D7
LED_PINS = [0, 2, 15, 16]    # D3, D4, D8, D0
MOSFET_GATE_PIN = 4          # D2
LED_ACTIVE_HIGH = True

TEST_DELAY_MS = 800
PIR_SAMPLE_MS = 200
# LDR / PWM settings (shared brightness)
PWM_FREQ = 1000
LDR_READING_HIGHER_IS_DARK = False
LDR_BRIGHT_RAW = 100
LDR_DARK_RAW = 900
LED_MIN_DUTY = 0
LED_MAX_DUTY = 1023


def led_off(pin):
	pin.value(0 if LED_ACTIVE_HIGH else 1)


def led_on(pin):
	pin.value(1 if LED_ACTIVE_HIGH else 0)


def setup_leds():
	leds = []
	for pin_no in LED_PINS:
		pin = machine.Pin(pin_no, machine.Pin.OUT)
		led_off(pin)
		leds.append(pin)
	return leds


def setup_gate():
	gate = machine.Pin(MOSFET_GATE_PIN, machine.Pin.OUT)
	pwm = machine.PWM(gate)
	pwm.freq(PWM_FREQ)
	pwm.duty(0)
	return pwm


def read_ambient_raw(samples=5):
	adc = machine.ADC(0)
	total = 0
	for _ in range(samples):
		total += adc.read()
	return total // samples


def clamp(value, lo, hi):
	if value < lo:
		return lo
	if value > hi:
		return hi
	return value


def ambient_to_duty(raw_value):
	bright_raw = min(LDR_BRIGHT_RAW, LDR_DARK_RAW)
	dark_raw = max(LDR_BRIGHT_RAW, LDR_DARK_RAW)
	if dark_raw == bright_raw:
		return LED_MAX_DUTY
	clamped_raw = clamp(raw_value, bright_raw, dark_raw)
	if LDR_READING_HIGHER_IS_DARK:
		darkness_ratio = (clamped_raw - bright_raw) / (dark_raw - bright_raw)
	else:
		darkness_ratio = (dark_raw - clamped_raw) / (dark_raw - bright_raw)
	brightness = LED_MIN_DUTY + int(darkness_ratio * (LED_MAX_DUTY - LED_MIN_DUTY))
	return clamp(brightness, LED_MIN_DUTY, LED_MAX_DUTY)


def set_shared_brightness(pwm, duty):
	pwm.duty(clamp(duty, LED_MIN_DUTY, LED_MAX_DUTY))


def setup_pirs():
	pirs = []
	for pin_no in PIR_PINS:
		pin = machine.Pin(pin_no, machine.Pin.IN)
		pirs.append(pin)
	return pirs


def test_leds(leds, gate):
	print("Testing LEDs one at a time...")
	print("The shared MOSFET gate will be held ON during this test.")
	# For the sequential LED test we force the gate fully ON so each LED
	# can be observed clearly regardless of ambient LDR reading.
	set_shared_brightness(gate, LED_MAX_DUTY)
	try:
		for index, led in enumerate(leds):
			print("LED {} ON".format(index + 1))
			led_on(led)
			time.sleep_ms(TEST_DELAY_MS)
			led_off(led)
			time.sleep_ms(200)
		print("LED test complete.")
	finally:
		set_shared_brightness(gate, 0)


def test_all_leds_on(leds, gate, auto=True):
	print("")
	print("Turning ALL LEDs ON continuously.")
	print("Use this mode to observe the shared LDR brightness behavior through the single MOSFET.")
	print("Press Ctrl+C to stop the test and return to the menu.")

	try:
		for led in leds:
			led_on(led)

		if not auto:
			# Force full gate ON for this test so all LEDs are clearly visible.
			set_shared_brightness(gate, LED_MAX_DUTY)
			while True:
				time.sleep_ms(500)
		else:
			# Auto-brightness mode: update PWM from LDR continuously and
			# print live A0 readings so you can verify the LDR is working.
			while True:
				ambient = read_ambient_raw()
				duty = ambient_to_duty(ambient)
				set_shared_brightness(gate, duty)
				# Print raw ADC and computed duty for live monitoring.
				print("A0: {}  duty: {}".format(ambient, duty))
				time.sleep_ms(500)
	except KeyboardInterrupt:
		print("All-LED test stopped.")
	finally:
		all_off(leds, gate)


def test_pir(pir, led, pir_number, gate):
	print("")
	print("PIR {} live test started on GPIO {}".format(pir_number, PIR_PINS[pir_number - 1]))
	print("Press Ctrl+C to stop the test and return to the menu.")
	print("Motion detected status is shown in real time.")
	previous_value = None
	try:
		while True:
			ambient = read_ambient_raw()
			duty = ambient_to_duty(ambient)
			set_shared_brightness(gate, duty)

			current_value = pir.value()

			if current_value:
				led_on(led)
				state = "MOTION DETECTED"
			else:
				led_off(led)
				state = "no motion"

			if current_value != previous_value:
				print("PIR {}: {}".format(pir_number, state))
				previous_value = current_value

			time.sleep_ms(PIR_SAMPLE_MS)
	except KeyboardInterrupt:
		print("PIR {} test stopped.".format(pir_number))
	finally:
		led_off(led)
		set_shared_brightness(gate, 0)


def all_off(leds, gate):
	for led in leds:
		led_off(led)
	set_shared_brightness(gate, 0)


def show_menu():
	print("")
	print("=== ESP8266 Hardware Test Menu ===")
	print("1. Sequentially test all LEDs by turning them on one at a time.")
	print("2. Test PIR Sensor 1 with live motion detection monitoring.")
	print("3. Test PIR Sensor 2 with live motion detection monitoring.")
	print("4. Test PIR Sensor 3 with live motion detection monitoring.")
	print("5. Test PIR Sensor 4 with live motion detection monitoring.")
	print("6. Turn ON all LEDs simultaneously and use LDR-driven auto-brightness.")
	print("q. Quit")


def read_choice():
	try:
		return input("Select an option (1-6, q): ").strip().lower()
	except EOFError:
		return "q"


def main():
	leds = setup_leds()
	gate = setup_gate()
	pirs = setup_pirs()

	try:
		print("Starting ESP8266 hardware self-test.")

		while True:
			show_menu()
			choice = read_choice()

			if choice == "1":
				test_leds(leds, gate)
			elif choice == "2":
				test_pir(pirs[0], leds[0], 1, gate)
			elif choice == "3":
				test_pir(pirs[1], leds[1], 2, gate)
			elif choice == "4":
				test_pir(pirs[2], leds[2], 3, gate)
			elif choice == "5":
				test_pir(pirs[3], leds[3], 4, gate)
			elif choice == "6":
				test_all_leds_on(leds, gate, auto=True)
			elif choice == "q":
				print("Exiting hardware test.")
				break
			else:
				print("Invalid choice. Enter 1-6 or q.")

		print("Hardware test finished.")
		print("If the LED, MOSFET, and PIR tests behaved correctly, the wiring is correct.")
		print("You can now run main.py.")
	finally:
		all_off(leds, gate)


if __name__ == "__main__":
	main()
