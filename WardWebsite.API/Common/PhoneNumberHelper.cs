using System.Text.RegularExpressions;

namespace WardWebsite.API.Common
{
    public static class PhoneNumberHelper
    {
        private static readonly Regex NonDigitRegex = new(@"\D", RegexOptions.Compiled);
        private static readonly Regex VietnamMobilePhoneRegex = new(@"^0(?:3|5|7|8|9)\d{8}$", RegexOptions.Compiled);

        public static string Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var digits = NonDigitRegex.Replace(value.Trim(), string.Empty);
            if (digits.StartsWith("84", StringComparison.Ordinal))
            {
                digits = $"0{digits[2..]}";
            }

            return digits;
        }

        public static bool TryNormalizeVietnamPhone(string? value, out string normalized)
        {
            normalized = Normalize(value);
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return false;
            }

            return VietnamMobilePhoneRegex.IsMatch(normalized);
        }
    }
}
