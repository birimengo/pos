// src/features/pos/data/currencyData.js
// Centralized file for all country and currency data - COMPLETE VERSION

// Complete list of all countries with flags and currencies
export const countries = [
  // North America
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$', flag: '🇺🇸', region: 'North America', position: 'before' },
  { code: 'CA', name: 'Canada', currency: 'CAD', symbol: 'C$', flag: '🇨🇦', region: 'North America', position: 'before' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', symbol: '$', flag: '🇲🇽', region: 'North America', position: 'before' },
  { code: 'GL', name: 'Greenland', currency: 'DKK', symbol: 'kr', flag: '🇬🇱', region: 'North America', position: 'after' },
  { code: 'BM', name: 'Bermuda', currency: 'BMD', symbol: '$', flag: '🇧🇲', region: 'North America', position: 'before' },
  
  // Central America
  { code: 'BZ', name: 'Belize', currency: 'BZD', symbol: '$', flag: '🇧🇿', region: 'Central America', position: 'before' },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC', symbol: '₡', flag: '🇨🇷', region: 'Central America', position: 'before' },
  { code: 'SV', name: 'El Salvador', currency: 'USD', symbol: '$', flag: '🇸🇻', region: 'Central America', position: 'before' },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', symbol: 'Q', flag: '🇬🇹', region: 'Central America', position: 'before' },
  { code: 'HN', name: 'Honduras', currency: 'HNL', symbol: 'L', flag: '🇭🇳', region: 'Central America', position: 'before' },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO', symbol: 'C$', flag: '🇳🇮', region: 'Central America', position: 'before' },
  { code: 'PA', name: 'Panama', currency: 'PAB', symbol: 'B/.', flag: '🇵🇦', region: 'Central America', position: 'before' },
  
  // Caribbean
  { code: 'AG', name: 'Antigua and Barbuda', currency: 'XCD', symbol: '$', flag: '🇦🇬', region: 'Caribbean', position: 'before' },
  { code: 'BS', name: 'Bahamas', currency: 'BSD', symbol: '$', flag: '🇧🇸', region: 'Caribbean', position: 'before' },
  { code: 'BB', name: 'Barbados', currency: 'BBD', symbol: '$', flag: '🇧🇧', region: 'Caribbean', position: 'before' },
  { code: 'CU', name: 'Cuba', currency: 'CUP', symbol: '$', flag: '🇨🇺', region: 'Caribbean', position: 'before' },
  { code: 'DM', name: 'Dominica', currency: 'XCD', symbol: '$', flag: '🇩🇲', region: 'Caribbean', position: 'before' },
  { code: 'DO', name: 'Dominican Republic', currency: 'DOP', symbol: 'RD$', flag: '🇩🇴', region: 'Caribbean', position: 'before' },
  { code: 'GD', name: 'Grenada', currency: 'XCD', symbol: '$', flag: '🇬🇩', region: 'Caribbean', position: 'before' },
  { code: 'HT', name: 'Haiti', currency: 'HTG', symbol: 'G', flag: '🇭🇹', region: 'Caribbean', position: 'before' },
  { code: 'JM', name: 'Jamaica', currency: 'JMD', symbol: '$', flag: '🇯🇲', region: 'Caribbean', position: 'before' },
  { code: 'KN', name: 'Saint Kitts and Nevis', currency: 'XCD', symbol: '$', flag: '🇰🇳', region: 'Caribbean', position: 'before' },
  { code: 'LC', name: 'Saint Lucia', currency: 'XCD', symbol: '$', flag: '🇱🇨', region: 'Caribbean', position: 'before' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', currency: 'XCD', symbol: '$', flag: '🇻🇨', region: 'Caribbean', position: 'before' },
  { code: 'TT', name: 'Trinidad and Tobago', currency: 'TTD', symbol: '$', flag: '🇹🇹', region: 'Caribbean', position: 'before' },
  { code: 'PR', name: 'Puerto Rico', currency: 'USD', symbol: '$', flag: '🇵🇷', region: 'Caribbean', position: 'before' },
  { code: 'KY', name: 'Cayman Islands', currency: 'KYD', symbol: '$', flag: '🇰🇾', region: 'Caribbean', position: 'before' },
  { code: 'VG', name: 'British Virgin Islands', currency: 'USD', symbol: '$', flag: '🇻🇬', region: 'Caribbean', position: 'before' },
  { code: 'VI', name: 'US Virgin Islands', currency: 'USD', symbol: '$', flag: '🇻🇮', region: 'Caribbean', position: 'before' },
  { code: 'AW', name: 'Aruba', currency: 'AWG', symbol: 'ƒ', flag: '🇦🇼', region: 'Caribbean', position: 'before' },
  { code: 'CW', name: 'Curaçao', currency: 'ANG', symbol: 'ƒ', flag: '🇨🇼', region: 'Caribbean', position: 'before' },
  { code: 'SX', name: 'Sint Maarten', currency: 'ANG', symbol: 'ƒ', flag: '🇸🇽', region: 'Caribbean', position: 'before' },
  
  // South America
  { code: 'AR', name: 'Argentina', currency: 'ARS', symbol: '$', flag: '🇦🇷', region: 'South America', position: 'before' },
  { code: 'BO', name: 'Bolivia', currency: 'BOB', symbol: 'Bs', flag: '🇧🇴', region: 'South America', position: 'before' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$', flag: '🇧🇷', region: 'South America', position: 'before' },
  { code: 'CL', name: 'Chile', currency: 'CLP', symbol: '$', flag: '🇨🇱', region: 'South America', position: 'before' },
  { code: 'CO', name: 'Colombia', currency: 'COP', symbol: '$', flag: '🇨🇴', region: 'South America', position: 'before' },
  { code: 'EC', name: 'Ecuador', currency: 'USD', symbol: '$', flag: '🇪🇨', region: 'South America', position: 'before' },
  { code: 'FK', name: 'Falkland Islands', currency: 'FKP', symbol: '£', flag: '🇫🇰', region: 'South America', position: 'before' },
  { code: 'GF', name: 'French Guiana', currency: 'EUR', symbol: '€', flag: '🇬🇫', region: 'South America', position: 'after' },
  { code: 'GY', name: 'Guyana', currency: 'GYD', symbol: '$', flag: '🇬🇾', region: 'South America', position: 'before' },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', symbol: '₲', flag: '🇵🇾', region: 'South America', position: 'before' },
  { code: 'PE', name: 'Peru', currency: 'PEN', symbol: 'S/', flag: '🇵🇪', region: 'South America', position: 'before' },
  { code: 'SR', name: 'Suriname', currency: 'SRD', symbol: '$', flag: '🇸🇷', region: 'South America', position: 'before' },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', symbol: '$', flag: '🇺🇾', region: 'South America', position: 'before' },
  { code: 'VE', name: 'Venezuela', currency: 'VES', symbol: 'Bs', flag: '🇻🇪', region: 'South America', position: 'before' },
  
  // Europe
  { code: 'AL', name: 'Albania', currency: 'ALL', symbol: 'L', flag: '🇦🇱', region: 'Europe', position: 'before' },
  { code: 'AD', name: 'Andorra', currency: 'EUR', symbol: '€', flag: '🇦🇩', region: 'Europe', position: 'after' },
  { code: 'AM', name: 'Armenia', currency: 'AMD', symbol: '֏', flag: '🇦🇲', region: 'Europe', position: 'after' },
  { code: 'AT', name: 'Austria', currency: 'EUR', symbol: '€', flag: '🇦🇹', region: 'Europe', position: 'after' },
  { code: 'AZ', name: 'Azerbaijan', currency: 'AZN', symbol: '₼', flag: '🇦🇿', region: 'Europe', position: 'after' },
  { code: 'BY', name: 'Belarus', currency: 'BYN', symbol: 'Br', flag: '🇧🇾', region: 'Europe', position: 'before' },
  { code: 'BE', name: 'Belgium', currency: 'EUR', symbol: '€', flag: '🇧🇪', region: 'Europe', position: 'after' },
  { code: 'BA', name: 'Bosnia and Herzegovina', currency: 'BAM', symbol: 'KM', flag: '🇧🇦', region: 'Europe', position: 'before' },
  { code: 'BG', name: 'Bulgaria', currency: 'BGN', symbol: 'лв', flag: '🇧🇬', region: 'Europe', position: 'after' },
  { code: 'HR', name: 'Croatia', currency: 'EUR', symbol: '€', flag: '🇭🇷', region: 'Europe', position: 'after' },
  { code: 'CY', name: 'Cyprus', currency: 'EUR', symbol: '€', flag: '🇨🇾', region: 'Europe', position: 'after' },
  { code: 'CZ', name: 'Czech Republic', currency: 'CZK', symbol: 'Kč', flag: '🇨🇿', region: 'Europe', position: 'after' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', symbol: 'kr', flag: '🇩🇰', region: 'Europe', position: 'after' },
  { code: 'EE', name: 'Estonia', currency: 'EUR', symbol: '€', flag: '🇪🇪', region: 'Europe', position: 'after' },
  { code: 'FO', name: 'Faroe Islands', currency: 'DKK', symbol: 'kr', flag: '🇫🇴', region: 'Europe', position: 'after' },
  { code: 'FI', name: 'Finland', currency: 'EUR', symbol: '€', flag: '🇫🇮', region: 'Europe', position: 'after' },
  { code: 'FR', name: 'France', currency: 'EUR', symbol: '€', flag: '🇫🇷', region: 'Europe', position: 'after' },
  { code: 'GE', name: 'Georgia', currency: 'GEL', symbol: '₾', flag: '🇬🇪', region: 'Europe', position: 'after' },
  { code: 'DE', name: 'Germany', currency: 'EUR', symbol: '€', flag: '🇩🇪', region: 'Europe', position: 'after' },
  { code: 'GI', name: 'Gibraltar', currency: 'GIP', symbol: '£', flag: '🇬🇮', region: 'Europe', position: 'before' },
  { code: 'GR', name: 'Greece', currency: 'EUR', symbol: '€', flag: '🇬🇷', region: 'Europe', position: 'after' },
  { code: 'HU', name: 'Hungary', currency: 'HUF', symbol: 'Ft', flag: '🇭🇺', region: 'Europe', position: 'after' },
  { code: 'IS', name: 'Iceland', currency: 'ISK', symbol: 'kr', flag: '🇮🇸', region: 'Europe', position: 'after' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', symbol: '€', flag: '🇮🇪', region: 'Europe', position: 'after' },
  { code: 'IT', name: 'Italy', currency: 'EUR', symbol: '€', flag: '🇮🇹', region: 'Europe', position: 'after' },
  { code: 'XK', name: 'Kosovo', currency: 'EUR', symbol: '€', flag: '🇽🇰', region: 'Europe', position: 'after' },
  { code: 'LV', name: 'Latvia', currency: 'EUR', symbol: '€', flag: '🇱🇻', region: 'Europe', position: 'after' },
  { code: 'LI', name: 'Liechtenstein', currency: 'CHF', symbol: 'Fr', flag: '🇱🇮', region: 'Europe', position: 'before' },
  { code: 'LT', name: 'Lithuania', currency: 'EUR', symbol: '€', flag: '🇱🇹', region: 'Europe', position: 'after' },
  { code: 'LU', name: 'Luxembourg', currency: 'EUR', symbol: '€', flag: '🇱🇺', region: 'Europe', position: 'after' },
  { code: 'MT', name: 'Malta', currency: 'EUR', symbol: '€', flag: '🇲🇹', region: 'Europe', position: 'after' },
  { code: 'MD', name: 'Moldova', currency: 'MDL', symbol: 'L', flag: '🇲🇩', region: 'Europe', position: 'before' },
  { code: 'MC', name: 'Monaco', currency: 'EUR', symbol: '€', flag: '🇲🇨', region: 'Europe', position: 'after' },
  { code: 'ME', name: 'Montenegro', currency: 'EUR', symbol: '€', flag: '🇲🇪', region: 'Europe', position: 'after' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', symbol: '€', flag: '🇳🇱', region: 'Europe', position: 'after' },
  { code: 'MK', name: 'North Macedonia', currency: 'MKD', symbol: 'ден', flag: '🇲🇰', region: 'Europe', position: 'after' },
  { code: 'NO', name: 'Norway', currency: 'NOK', symbol: 'kr', flag: '🇳🇴', region: 'Europe', position: 'after' },
  { code: 'PL', name: 'Poland', currency: 'PLN', symbol: 'zł', flag: '🇵🇱', region: 'Europe', position: 'after' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', symbol: '€', flag: '🇵🇹', region: 'Europe', position: 'after' },
  { code: 'RO', name: 'Romania', currency: 'RON', symbol: 'lei', flag: '🇷🇴', region: 'Europe', position: 'after' },
  { code: 'RU', name: 'Russia', currency: 'RUB', symbol: '₽', flag: '🇷🇺', region: 'Europe', position: 'after' },
  { code: 'SM', name: 'San Marino', currency: 'EUR', symbol: '€', flag: '🇸🇲', region: 'Europe', position: 'after' },
  { code: 'RS', name: 'Serbia', currency: 'RSD', symbol: 'дин', flag: '🇷🇸', region: 'Europe', position: 'after' },
  { code: 'SK', name: 'Slovakia', currency: 'EUR', symbol: '€', flag: '🇸🇰', region: 'Europe', position: 'after' },
  { code: 'SI', name: 'Slovenia', currency: 'EUR', symbol: '€', flag: '🇸🇮', region: 'Europe', position: 'after' },
  { code: 'ES', name: 'Spain', currency: 'EUR', symbol: '€', flag: '🇪🇸', region: 'Europe', position: 'after' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', symbol: 'kr', flag: '🇸🇪', region: 'Europe', position: 'after' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', symbol: 'Fr', flag: '🇨🇭', region: 'Europe', position: 'before' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', symbol: '₺', flag: '🇹🇷', region: 'Europe', position: 'after' },
  { code: 'UA', name: 'Ukraine', currency: 'UAH', symbol: '₴', flag: '🇺🇦', region: 'Europe', position: 'after' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£', flag: '🇬🇧', region: 'Europe', position: 'before' },
  { code: 'VA', name: 'Vatican City', currency: 'EUR', symbol: '€', flag: '🇻🇦', region: 'Europe', position: 'after' },
  
  // Africa
  { code: 'DZ', name: 'Algeria', currency: 'DZD', symbol: 'دج', flag: '🇩🇿', region: 'Africa', position: 'after' },
  { code: 'AO', name: 'Angola', currency: 'AOA', symbol: 'Kz', flag: '🇦🇴', region: 'Africa', position: 'before' },
  { code: 'BJ', name: 'Benin', currency: 'XOF', symbol: 'CFA', flag: '🇧🇯', region: 'Africa', position: 'before' },
  { code: 'BW', name: 'Botswana', currency: 'BWP', symbol: 'P', flag: '🇧🇼', region: 'Africa', position: 'before' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF', symbol: 'CFA', flag: '🇧🇫', region: 'Africa', position: 'before' },
  { code: 'BI', name: 'Burundi', currency: 'BIF', symbol: 'Fr', flag: '🇧🇮', region: 'Africa', position: 'before' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF', symbol: 'Fr', flag: '🇨🇲', region: 'Africa', position: 'before' },
  { code: 'CV', name: 'Cape Verde', currency: 'CVE', symbol: '$', flag: '🇨🇻', region: 'Africa', position: 'before' },
  { code: 'CF', name: 'Central African Republic', currency: 'XAF', symbol: 'Fr', flag: '🇨🇫', region: 'Africa', position: 'before' },
  { code: 'TD', name: 'Chad', currency: 'XAF', symbol: 'Fr', flag: '🇹🇩', region: 'Africa', position: 'before' },
  { code: 'KM', name: 'Comoros', currency: 'KMF', symbol: 'Fr', flag: '🇰🇲', region: 'Africa', position: 'before' },
  { code: 'CG', name: 'Congo', currency: 'XAF', symbol: 'Fr', flag: '🇨🇬', region: 'Africa', position: 'before' },
  { code: 'CD', name: 'DR Congo', currency: 'CDF', symbol: 'Fr', flag: '🇨🇩', region: 'Africa', position: 'before' },
  { code: 'DJ', name: 'Djibouti', currency: 'DJF', symbol: 'Fr', flag: '🇩🇯', region: 'Africa', position: 'before' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', symbol: 'E£', flag: '🇪🇬', region: 'Africa', position: 'before' },
  { code: 'GQ', name: 'Equatorial Guinea', currency: 'XAF', symbol: 'Fr', flag: '🇬🇶', region: 'Africa', position: 'before' },
  { code: 'ER', name: 'Eritrea', currency: 'ERN', symbol: 'Nfk', flag: '🇪🇷', region: 'Africa', position: 'before' },
  { code: 'SZ', name: 'Eswatini', currency: 'SZL', symbol: 'L', flag: '🇸🇿', region: 'Africa', position: 'before' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB', symbol: 'Br', flag: '🇪🇹', region: 'Africa', position: 'before' },
  { code: 'GA', name: 'Gabon', currency: 'XAF', symbol: 'Fr', flag: '🇬🇦', region: 'Africa', position: 'before' },
  { code: 'GM', name: 'Gambia', currency: 'GMD', symbol: 'D', flag: '🇬🇲', region: 'Africa', position: 'before' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', symbol: '₵', flag: '🇬🇭', region: 'Africa', position: 'before' },
  { code: 'GN', name: 'Guinea', currency: 'GNF', symbol: 'Fr', flag: '🇬🇳', region: 'Africa', position: 'before' },
  { code: 'GW', name: 'Guinea-Bissau', currency: 'XOF', symbol: 'CFA', flag: '🇬🇼', region: 'Africa', position: 'before' },
  { code: 'CI', name: 'Ivory Coast', currency: 'XOF', symbol: 'CFA', flag: '🇨🇮', region: 'Africa', position: 'before' },
  { code: 'KE', name: 'Kenya', currency: 'KES', symbol: 'KSh', flag: '🇰🇪', region: 'Africa', position: 'before' },
  { code: 'LS', name: 'Lesotho', currency: 'LSL', symbol: 'L', flag: '🇱🇸', region: 'Africa', position: 'before' },
  { code: 'LR', name: 'Liberia', currency: 'LRD', symbol: '$', flag: '🇱🇷', region: 'Africa', position: 'before' },
  { code: 'LY', name: 'Libya', currency: 'LYD', symbol: 'ل.د', flag: '🇱🇾', region: 'Africa', position: 'after' },
  { code: 'MG', name: 'Madagascar', currency: 'MGA', symbol: 'Ar', flag: '🇲🇬', region: 'Africa', position: 'before' },
  { code: 'MW', name: 'Malawi', currency: 'MWK', symbol: 'MK', flag: '🇲🇼', region: 'Africa', position: 'before' },
  { code: 'ML', name: 'Mali', currency: 'XOF', symbol: 'CFA', flag: '🇲🇱', region: 'Africa', position: 'before' },
  { code: 'MR', name: 'Mauritania', currency: 'MRU', symbol: 'UM', flag: '🇲🇷', region: 'Africa', position: 'before' },
  { code: 'MU', name: 'Mauritius', currency: 'MUR', symbol: '₨', flag: '🇲🇺', region: 'Africa', position: 'before' },
  { code: 'YT', name: 'Mayotte', currency: 'EUR', symbol: '€', flag: '🇾🇹', region: 'Africa', position: 'after' },
  { code: 'MA', name: 'Morocco', currency: 'MAD', symbol: 'د.م.', flag: '🇲🇦', region: 'Africa', position: 'after' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN', symbol: 'MT', flag: '🇲🇿', region: 'Africa', position: 'before' },
  { code: 'NA', name: 'Namibia', currency: 'NAD', symbol: '$', flag: '🇳🇦', region: 'Africa', position: 'before' },
  { code: 'NE', name: 'Niger', currency: 'XOF', symbol: 'CFA', flag: '🇳🇪', region: 'Africa', position: 'before' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦', flag: '🇳🇬', region: 'Africa', position: 'before' },
  { code: 'RE', name: 'Réunion', currency: 'EUR', symbol: '€', flag: '🇷🇪', region: 'Africa', position: 'after' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF', symbol: 'Fr', flag: '🇷🇼', region: 'Africa', position: 'before' },
  { code: 'ST', name: 'São Tomé and Príncipe', currency: 'STN', symbol: 'Db', flag: '🇸🇹', region: 'Africa', position: 'before' },
  { code: 'SN', name: 'Senegal', currency: 'XOF', symbol: 'CFA', flag: '🇸🇳', region: 'Africa', position: 'before' },
  { code: 'SC', name: 'Seychelles', currency: 'SCR', symbol: '₨', flag: '🇸🇨', region: 'Africa', position: 'before' },
  { code: 'SL', name: 'Sierra Leone', currency: 'SLL', symbol: 'Le', flag: '🇸🇱', region: 'Africa', position: 'before' },
  { code: 'SO', name: 'Somalia', currency: 'SOS', symbol: 'Sh', flag: '🇸🇴', region: 'Africa', position: 'before' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R', flag: '🇿🇦', region: 'Africa', position: 'before' },
  { code: 'SS', name: 'South Sudan', currency: 'SSP', symbol: '£', flag: '🇸🇸', region: 'Africa', position: 'before' },
  { code: 'SD', name: 'Sudan', currency: 'SDG', symbol: 'ج.س.', flag: '🇸🇩', region: 'Africa', position: 'after' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', symbol: 'Sh', flag: '🇹🇿', region: 'Africa', position: 'before' },
  { code: 'TG', name: 'Togo', currency: 'XOF', symbol: 'CFA', flag: '🇹🇬', region: 'Africa', position: 'before' },
  { code: 'TN', name: 'Tunisia', currency: 'TND', symbol: 'د.ت', flag: '🇹🇳', region: 'Africa', position: 'after' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', symbol: 'Sh', flag: '🇺🇬', region: 'Africa', position: 'before' },
  { code: 'EH', name: 'Western Sahara', currency: 'MAD', symbol: 'د.م.', flag: '🇪🇭', region: 'Africa', position: 'after' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW', symbol: 'ZK', flag: '🇿🇲', region: 'Africa', position: 'before' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'USD', symbol: '$', flag: '🇿🇼', region: 'Africa', position: 'before' },
  
  // Asia
  { code: 'AF', name: 'Afghanistan', currency: 'AFN', symbol: '؋', flag: '🇦🇫', region: 'Asia', position: 'before' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', symbol: '.د.ب', flag: '🇧🇭', region: 'Asia', position: 'after' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: '৳', flag: '🇧🇩', region: 'Asia', position: 'before' },
  { code: 'BT', name: 'Bhutan', currency: 'BTN', symbol: 'Nu.', flag: '🇧🇹', region: 'Asia', position: 'before' },
  { code: 'BN', name: 'Brunei', currency: 'BND', symbol: '$', flag: '🇧🇳', region: 'Asia', position: 'before' },
  { code: 'KH', name: 'Cambodia', currency: 'KHR', symbol: '៛', flag: '🇰🇭', region: 'Asia', position: 'before' },
  { code: 'CN', name: 'China', currency: 'CNY', symbol: '¥', flag: '🇨🇳', region: 'Asia', position: 'before' },
  { code: 'TL', name: 'East Timor', currency: 'USD', symbol: '$', flag: '🇹🇱', region: 'Asia', position: 'before' },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹', flag: '🇮🇳', region: 'Asia', position: 'before' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', symbol: 'Rp', flag: '🇮🇩', region: 'Asia', position: 'before' },
  { code: 'IR', name: 'Iran', currency: 'IRR', symbol: '﷼', flag: '🇮🇷', region: 'Asia', position: 'after' },
  { code: 'IQ', name: 'Iraq', currency: 'IQD', symbol: 'ع.د', flag: '🇮🇶', region: 'Asia', position: 'after' },
  { code: 'IL', name: 'Israel', currency: 'ILS', symbol: '₪', flag: '🇮🇱', region: 'Asia', position: 'before' },
  { code: 'JP', name: 'Japan', currency: 'JPY', symbol: '¥', flag: '🇯🇵', region: 'Asia', position: 'before' },
  { code: 'JO', name: 'Jordan', currency: 'JOD', symbol: 'د.ا', flag: '🇯🇴', region: 'Asia', position: 'after' },
  { code: 'KZ', name: 'Kazakhstan', currency: 'KZT', symbol: '₸', flag: '🇰🇿', region: 'Asia', position: 'after' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', symbol: 'د.ك', flag: '🇰🇼', region: 'Asia', position: 'after' },
  { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS', symbol: 'с', flag: '🇰🇬', region: 'Asia', position: 'after' },
  { code: 'LA', name: 'Laos', currency: 'LAK', symbol: '₭', flag: '🇱🇦', region: 'Asia', position: 'before' },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', symbol: 'ل.ل', flag: '🇱🇧', region: 'Asia', position: 'after' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', symbol: 'RM', flag: '🇲🇾', region: 'Asia', position: 'before' },
  { code: 'MV', name: 'Maldives', currency: 'MVR', symbol: 'Rf', flag: '🇲🇻', region: 'Asia', position: 'before' },
  { code: 'MN', name: 'Mongolia', currency: 'MNT', symbol: '₮', flag: '🇲🇳', region: 'Asia', position: 'before' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK', symbol: 'Ks', flag: '🇲🇲', region: 'Asia', position: 'before' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', symbol: '₨', flag: '🇳🇵', region: 'Asia', position: 'before' },
  { code: 'KP', name: 'North Korea', currency: 'KPW', symbol: '₩', flag: '🇰🇵', region: 'Asia', position: 'before' },
  { code: 'OM', name: 'Oman', currency: 'OMR', symbol: 'ر.ع.', flag: '🇴🇲', region: 'Asia', position: 'after' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: '₨', flag: '🇵🇰', region: 'Asia', position: 'before' },
  { code: 'PS', name: 'Palestine', currency: 'ILS', symbol: '₪', flag: '🇵🇸', region: 'Asia', position: 'before' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', symbol: '₱', flag: '🇵🇭', region: 'Asia', position: 'before' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', symbol: 'ر.ق', flag: '🇶🇦', region: 'Asia', position: 'after' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', symbol: 'ر.س', flag: '🇸🇦', region: 'Asia', position: 'after' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', symbol: 'S$', flag: '🇸🇬', region: 'Asia', position: 'before' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', symbol: '₩', flag: '🇰🇷', region: 'Asia', position: 'before' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', symbol: 'Rs', flag: '🇱🇰', region: 'Asia', position: 'before' },
  { code: 'SY', name: 'Syria', currency: 'SYP', symbol: '£S', flag: '🇸🇾', region: 'Asia', position: 'before' },
  { code: 'TW', name: 'Taiwan', currency: 'TWD', symbol: 'NT$', flag: '🇹🇼', region: 'Asia', position: 'before' },
  { code: 'TJ', name: 'Tajikistan', currency: 'TJS', symbol: 'ЅМ', flag: '🇹🇯', region: 'Asia', position: 'before' },
  { code: 'TH', name: 'Thailand', currency: 'THB', symbol: '฿', flag: '🇹🇭', region: 'Asia', position: 'before' },
  { code: 'TM', name: 'Turkmenistan', currency: 'TMT', symbol: 'm', flag: '🇹🇲', region: 'Asia', position: 'after' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', symbol: 'د.إ', flag: '🇦🇪', region: 'Asia', position: 'after' },
  { code: 'UZ', name: 'Uzbekistan', currency: 'UZS', symbol: 'сўм', flag: '🇺🇿', region: 'Asia', position: 'after' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', symbol: '₫', flag: '🇻🇳', region: 'Asia', position: 'after' },
  { code: 'YE', name: 'Yemen', currency: 'YER', symbol: '﷼', flag: '🇾🇪', region: 'Asia', position: 'after' },
  
  // Oceania
  { code: 'AS', name: 'American Samoa', currency: 'USD', symbol: '$', flag: '🇦🇸', region: 'Oceania', position: 'before' },
  { code: 'AU', name: 'Australia', currency: 'AUD', symbol: 'A$', flag: '🇦🇺', region: 'Oceania', position: 'before' },
  { code: 'CK', name: 'Cook Islands', currency: 'NZD', symbol: '$', flag: '🇨🇰', region: 'Oceania', position: 'before' },
  { code: 'FJ', name: 'Fiji', currency: 'FJD', symbol: '$', flag: '🇫🇯', region: 'Oceania', position: 'before' },
  { code: 'PF', name: 'French Polynesia', currency: 'XPF', symbol: 'Fr', flag: '🇵🇫', region: 'Oceania', position: 'before' },
  { code: 'GU', name: 'Guam', currency: 'USD', symbol: '$', flag: '🇬🇺', region: 'Oceania', position: 'before' },
  { code: 'KI', name: 'Kiribati', currency: 'AUD', symbol: '$', flag: '🇰🇮', region: 'Oceania', position: 'before' },
  { code: 'MH', name: 'Marshall Islands', currency: 'USD', symbol: '$', flag: '🇲🇭', region: 'Oceania', position: 'before' },
  { code: 'FM', name: 'Micronesia', currency: 'USD', symbol: '$', flag: '🇫🇲', region: 'Oceania', position: 'before' },
  { code: 'NR', name: 'Nauru', currency: 'AUD', symbol: '$', flag: '🇳🇷', region: 'Oceania', position: 'before' },
  { code: 'NC', name: 'New Caledonia', currency: 'XPF', symbol: 'Fr', flag: '🇳🇨', region: 'Oceania', position: 'before' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', symbol: 'NZ$', flag: '🇳🇿', region: 'Oceania', position: 'before' },
  { code: 'NU', name: 'Niue', currency: 'NZD', symbol: '$', flag: '🇳🇺', region: 'Oceania', position: 'before' },
  { code: 'NF', name: 'Norfolk Island', currency: 'AUD', symbol: '$', flag: '🇳🇫', region: 'Oceania', position: 'before' },
  { code: 'MP', name: 'Northern Mariana Islands', currency: 'USD', symbol: '$', flag: '🇲🇵', region: 'Oceania', position: 'before' },
  { code: 'PW', name: 'Palau', currency: 'USD', symbol: '$', flag: '🇵🇼', region: 'Oceania', position: 'before' },
  { code: 'PG', name: 'Papua New Guinea', currency: 'PGK', symbol: 'K', flag: '🇵🇬', region: 'Oceania', position: 'before' },
  { code: 'PN', name: 'Pitcairn Islands', currency: 'NZD', symbol: '$', flag: '🇵🇳', region: 'Oceania', position: 'before' },
  { code: 'WS', name: 'Samoa', currency: 'WST', symbol: 'T', flag: '🇼🇸', region: 'Oceania', position: 'before' },
  { code: 'SB', name: 'Solomon Islands', currency: 'SBD', symbol: '$', flag: '🇸🇧', region: 'Oceania', position: 'before' },
  { code: 'TK', name: 'Tokelau', currency: 'NZD', symbol: '$', flag: '🇹🇰', region: 'Oceania', position: 'before' },
  { code: 'TO', name: 'Tonga', currency: 'TOP', symbol: 'T$', flag: '🇹🇴', region: 'Oceania', position: 'before' },
  { code: 'TV', name: 'Tuvalu', currency: 'AUD', symbol: '$', flag: '🇹🇻', region: 'Oceania', position: 'before' },
  { code: 'VU', name: 'Vanuatu', currency: 'VUV', symbol: 'Vt', flag: '🇻🇺', region: 'Oceania', position: 'before' },
  { code: 'WF', name: 'Wallis and Futuna', currency: 'XPF', symbol: 'Fr', flag: '🇼🇫', region: 'Oceania', position: 'before' },
];

// Helper function to get country by code
export const getCountryByCode = (code) => {
  return countries.find(country => country.code === code) || countries[0];
};

// Helper function to get currency by country code
export const getCurrencyByCountry = (countryCode) => {
  const country = getCountryByCode(countryCode);
  return {
    code: country.currency,
    symbol: country.symbol,
    name: country.name,
    position: country.position || 'before',
    flag: country.flag,
    countryCode: country.code
  };
};

// Helper function to format price based on country
export const formatPriceWithCountry = (amount, countryCode, options = {}) => {
  const { showSymbol = true, showCode = false, decimals = 2 } = options;
  const country = getCountryByCode(countryCode);
  
  if (amount === undefined || amount === null) {
    if (showSymbol) {
      return country.position === 'after' ? `0${country.symbol}` : `${country.symbol}0`;
    }
    return '0';
  }
  
  const rounded = Math.round(amount * 100) / 100;
  const formattedNumber = rounded.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
  
  if (showCode) {
    return `${country.currency} ${formattedNumber}`;
  }
  
  if (showSymbol) {
    if (country.position === 'after') {
      return `${formattedNumber}${country.symbol}`;
    }
    return `${country.symbol}${formattedNumber}`;
  }
  
  return formattedNumber;
};

// Group countries by region
export const groupedCountries = countries.reduce((groups, country) => {
  if (!groups[country.region]) {
    groups[country.region] = [];
  }
  groups[country.region].push(country);
  return groups;
}, {});

// Sort regions in logical order
export const sortedRegions = ['North America', 'Central America', 'Caribbean', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania'];

// Sort countries within each region alphabetically
Object.keys(groupedCountries).forEach(region => {
  groupedCountries[region].sort((a, b) => a.name.localeCompare(b.name));
});

// Export total count
export const totalCountries = countries.length;

// Export currency symbols mapping for quick lookup
export const currencySymbols = {
  'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': 'C$', 'AUD': 'A$', 'INR': '₹',
  'CNY': '¥', 'BRL': 'R$', 'ZAR': 'R', 'MXN': '$', 'KRW': '₩', 'RUB': '₽', 'TRY': '₺',
  'SAR': 'ر.س', 'AED': 'د.إ', 'SGD': 'S$', 'MYR': 'RM', 'PHP': '₱', 'VND': '₫', 'THB': '฿',
  'IDR': 'Rp', 'PKR': '₨', 'BDT': '৳', 'NGN': '₦', 'EGP': 'E£', 'KES': 'KSh', 'ARS': '$',
  'CLP': '$', 'COP': '$', 'PEN': 'S/', 'NZD': 'NZ$', 'CHF': 'Fr', 'SEK': 'kr', 'NOK': 'kr',
  'DKK': 'kr', 'PLN': 'zł', 'ILS': '₪', 'HKD': 'HK$', 'TWD': 'NT$', 'XCD': '$', 'XOF': 'CFA',
  'XAF': 'Fr', 'XPF': 'Fr', 'BMD': '$', 'BSD': '$', 'BBD': '$', 'BZD': '$', 'KYD': '$',
  'TTD': '$', 'JMD': '$', 'GYD': '$', 'SRD': '$', 'FJD': '$', 'SBD': '$', 'PGK': 'K',
  'TOP': 'T$', 'WST': 'T', 'VUV': 'Vt', 'KHR': '៛', 'LAK': '₭', 'MMK': 'Ks', 'NPR': '₨',
  'MVR': 'Rf', 'BTN': 'Nu.', 'KGS': 'с', 'TJS': 'ЅМ', 'UZS': 'сўм', 'KZT': '₸', 'MNT': '₮',
  'KPW': '₩', 'AFN': '؋', 'IRR': '﷼', 'IQD': 'ع.د', 'LYD': 'ل.د', 'TND': 'د.ت', 'MAD': 'د.م.',
  'DZD': 'دج', 'BHD': '.د.ب', 'KWD': 'د.ك', 'OMR': 'ر.ع.', 'QAR': 'ر.ق', 'JOD': 'د.ا', 'LBP': 'ل.ل',
  'SYP': '£S', 'YER': '﷼', 'SDG': 'ج.س.', 'SSP': '£', 'ERN': 'Nfk', 'ETB': 'Br', 'GHS': '₵',
  'GMD': 'D', 'GNF': 'Fr', 'HTG': 'G', 'HNL': 'L', 'NIO': 'C$', 'PAB': 'B/.', 'PYG': '₲',
  'UYU': '$', 'VES': 'Bs', 'BOB': 'Bs', 'ALL': 'L', 'AMD': '֏', 'AZN': '₼', 'BYN': 'Br',
  'BAM': 'KM', 'BGN': 'лв', 'CZK': 'Kč', 'DOP': 'RD$', 'FKP': '£', 'GEL': '₾', 'GIP': '£',
  'HUF': 'Ft', 'ISK': 'kr', 'MDL': 'L', 'MKD': 'ден', 'RON': 'lei', 'RSD': 'дин', 'UAH': '₴',
  'ANG': 'ƒ', 'AWG': 'ƒ', 'CUP': '$', 'CVE': '$', 'DJF': 'Fr', 'KMF': 'Fr', 'MGA': 'Ar',
  'MUR': '₨', 'MRU': 'UM', 'MZN': 'MT', 'NAD': '$', 'RWF': 'Fr', 'SCR': '₨', 'SLL': 'Le',
  'SOS': 'Sh', 'STN': 'Db', 'SZL': 'L', 'TZS': 'Sh', 'UGX': 'Sh', 'ZMW': 'ZK'
};

// Export all countries array
export default countries;