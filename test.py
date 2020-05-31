import unittest

from app import get_chat_name


class FirstTest(unittest.TestCase):

    def first_test(self):
        self.assertEqual(get_chat_name("to_user", "margo", "margo"), "margo_margo")


if __name__ == '__main__':
    unittest.main()
