using System.ComponentModel.DataAnnotations;

namespace TaskScheduler.API.Services;

internal static class ValidationMessageBuilder
{
    public static string? Build(object model)
    {
        var validationResults = new List<ValidationResult>();
        var validationContext = new ValidationContext(model);

        var isValid = Validator.TryValidateObject(
            model,
            validationContext,
            validationResults,
            validateAllProperties: true);

        if (isValid)
        {
            return null;
        }

        return string.Join(
            " ",
            validationResults
                .Select(result => result.ErrorMessage)
                .Where(message => !string.IsNullOrWhiteSpace(message))!);
    }
}